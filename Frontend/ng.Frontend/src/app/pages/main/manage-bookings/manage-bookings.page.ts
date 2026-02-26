import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import { BookingService } from '../../../shared/services/booking.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BookingEditModalComponent } from './booking-edit-modal.component';

export type ViewMode = 'today' | 'week' | 'month' | 'all' | 'room' | 'user' | 'campus';
export type GroupByMode = 'day' | 'week' | 'month' | 'room' | 'user' | 'campus';
export type DateRange = 'today' | 'week' | 'month' | 'all';

export interface BookingGroup {
  key: string;
  label: string;
  subtitle: string;
  bookings: BookingDetailedReadModel[];
  totalCount: number;
}

@Component({
  selector: 'app-manage-bookings-page',
  imports: [DatePipe],
  templateUrl: './manage-bookings.page.html',
  styleUrl: './manage-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageBookingsPage {
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  // --- Filter state ---
  searchQuery = signal('');
  selectedStatus = signal<BookingStatus | 'All'>(BookingStatus.Active);
  viewMode = signal<ViewMode>('week');
  collapsedGroups = signal<Set<string>>(new Set());
  pageIndex = signal(0);
  readonly groupsPerPage = 7;

  // Derived from viewMode
  readonly selectedDateRange = computed((): DateRange => {
    const vm = this.viewMode();
    switch (vm) {
      case 'today':
        return 'today';
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      case 'all':
        return 'all';
      default:
        return 'all'; // entity modes show all time
    }
  });

  readonly groupBy = computed((): GroupByMode => {
    const vm = this.viewMode();
    switch (vm) {
      case 'today':
        return 'day';
      case 'week':
        return 'day';
      case 'month':
        return 'week';
      case 'all':
        return 'month';
      default:
        return vm; // 'room' | 'user' | 'campus'
    }
  });

  // --- Resource ---
  bookingsResource = resource({
    loader: () => firstValueFrom(this.bookingService.getAllBookings()),
  });

  readonly bookings = computed(() => this.bookingsResource.value() ?? []);

  private getDateBounds(range: DateRange): { start: Date; end: Date } | null {
    if (range === 'all') return null;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (range) {
      case 'today':
        return { start: startOfDay, end: new Date(startOfDay.getTime() + 86_400_000) };
      case 'week': {
        const day = startOfDay.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday-based
        const monday = new Date(startOfDay.getTime() - diff * 86_400_000);
        return { start: monday, end: new Date(monday.getTime() + 7 * 86_400_000) };
      }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        };
    }
  }

  readonly filteredBookings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();
    const bounds = this.getDateBounds(this.selectedDateRange());

    return this.bookings().filter((b) => {
      const matchesStatus = status === 'All' || b.status === status;
      const matchesSearch =
        !query ||
        (b.userName ?? '').toLowerCase().includes(query) ||
        (b.userEmail ?? '').toLowerCase().includes(query) ||
        (b.roomName ?? '').toLowerCase().includes(query) ||
        (b.campusCity ?? '').toLowerCase().includes(query) ||
        (b.notes ?? '').toLowerCase().includes(query);
      const matchesDate =
        !bounds ||
        (b.startTime != null &&
          new Date(b.startTime) >= bounds.start &&
          new Date(b.startTime) < bounds.end);
      return matchesStatus && matchesSearch && matchesDate;
    });
  });

  readonly totalBookings = computed(() => this.filteredBookings().length);
  readonly totalAllBookings = computed(() => this.bookings().length);

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery() !== '' ||
      this.selectedStatus() !== BookingStatus.Active ||
      this.viewMode() !== 'week',
  );

  // --- Grouping helpers ---
  isTimeGrouping(): boolean {
    const m = this.groupBy();
    return m === 'day' || m === 'week' || m === 'month';
  }

  private getISOYearWeek(date: Date): [number, number] {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // --- Grouping ---
  readonly groupedBookings = computed((): BookingGroup[] => {
    const bookings = this.filteredBookings();
    const mode = this.groupBy();
    const map = new Map<string, BookingDetailedReadModel[]>();

    for (const b of bookings) {
      let key: string;
      switch (mode) {
        case 'day': {
          const d = b.startTime ? new Date(b.startTime) : null;
          key = d
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            : 'unknown';
          break;
        }
        case 'week': {
          const d = b.startTime ? new Date(b.startTime) : null;
          if (d) {
            const [y, w] = this.getISOYearWeek(d);
            key = `${y}-W${String(w).padStart(2, '0')}`;
          } else {
            key = 'unknown';
          }
          break;
        }
        case 'month': {
          const d = b.startTime ? new Date(b.startTime) : null;
          key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
          break;
        }
        case 'room':
          key = String(b.roomId ?? 0);
          break;
        case 'user':
          key = String(b.userId ?? 0);
          break;
        case 'campus':
          key = b.campusCity ?? 'Okänt campus';
          break;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }

    const isTimeBased = mode === 'day' || mode === 'week' || mode === 'month';

    return Array.from(map.entries())
      .map(([key, items]) => {
        const first = items[0];
        let label: string;
        let subtitle: string;

        switch (mode) {
          case 'day': {
            const d = new Date(key + 'T00:00:00');
            label = this.capitalize(
              d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }),
            );
            subtitle = `${items.length} bokning${items.length !== 1 ? 'ar' : ''}`;
            break;
          }
          case 'week': {
            const weekNum = parseInt(key.split('-W')[1], 10);
            const year = parseInt(key.split('-W')[0], 10);
            // ISO week: find Monday of this week
            const jan4 = new Date(year, 0, 4);
            const mondayOfWeek1 = new Date(
              jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86_400_000,
            );
            const monday = new Date(mondayOfWeek1.getTime() + (weekNum - 1) * 7 * 86_400_000);
            const sunday = new Date(monday.getTime() + 6 * 86_400_000);
            const fmt = (d: Date) =>
              d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
            label = `Vecka ${weekNum} · ${fmt(monday)} – ${fmt(sunday)}`;
            subtitle = `${items.length} bokning${items.length !== 1 ? 'ar' : ''}`;
            break;
          }
          case 'month': {
            const [y, m] = key.split('-').map(Number);
            label = this.capitalize(
              new Date(y, m - 1, 1).toLocaleDateString('sv-SE', {
                month: 'long',
                year: 'numeric',
              }),
            );
            subtitle = `${items.length} bokning${items.length !== 1 ? 'ar' : ''}`;
            break;
          }
          case 'room':
            label = first.roomName ?? 'Okänt rum';
            subtitle = [
              first.roomType,
              first.roomCapacity ? `Kapacitet: ${first.roomCapacity}` : null,
            ]
              .filter(Boolean)
              .join(' • ');
            break;
          case 'user':
            label = first.userName ?? 'Okänd användare';
            subtitle = first.userEmail ?? '';
            break;
          case 'campus':
            label = first.campusCity ?? 'Okänt campus';
            subtitle = `${items.length} bokning${items.length !== 1 ? 'ar' : ''}`;
            break;
        }

        return {
          key,
          label,
          subtitle,
          bookings: items.sort(
            (a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime(),
          ),
          totalCount: items.length,
        };
      })
      .sort((a, b) =>
        isTimeBased ? a.key.localeCompare(b.key) : a.label.localeCompare(b.label, 'sv'),
      );
  });

  readonly totalGroups = computed(() => this.groupedBookings().length);

  readonly totalPages = computed(() => Math.ceil(this.totalGroups() / this.groupsPerPage));

  readonly paginatedGroups = computed(() => {
    const all = this.groupedBookings();
    const start = this.pageIndex() * this.groupsPerPage;
    return all.slice(start, start + this.groupsPerPage);
  });

  // --- Filter actions ---
  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  updateStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as BookingStatus | 'All');
    this.pageIndex.set(0);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set(BookingStatus.Active);
    this.viewMode.set('week');
    this.pageIndex.set(0);
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.pageIndex.set(0);
    this.collapsedGroups.set(new Set());
  }

  toggleGroupCollapse(key: string): void {
    const current = new Set(this.collapsedGroups());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.collapsedGroups.set(current);
  }

  isGroupCollapsed(key: string): boolean {
    return this.collapsedGroups().has(key);
  }

  readonly allCollapsed = computed(() => {
    const groups = this.groupedBookings();
    if (groups.length === 0) return false;
    const collapsed = this.collapsedGroups();
    return groups.every((g) => collapsed.has(g.key));
  });

  toggleAllCollapse(): void {
    if (this.allCollapsed()) {
      this.collapsedGroups.set(new Set());
    } else {
      this.collapsedGroups.set(new Set(this.groupedBookings().map((g) => g.key)));
    }
  }

  handlePageChange(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
    }
  }

  getInitials(name?: string | null): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // --- Status label ---
  statusLabel(status?: BookingStatus): string {
    switch (status) {
      case BookingStatus.Active:
        return 'Aktiv';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '—';
    }
  }

  // --- Modal ---
  openBookingModal(booking: BookingDetailedReadModel, event?: Event): void {
    if (event) event.stopPropagation();

    this.modalService.open(BookingEditModalComponent, {
      title: 'Bokningsdetaljer',
      data: {
        booking,
        onStatusChange: (bookingId: number, newStatus: BookingStatus) =>
          this.handleStatusChange(bookingId, newStatus),
      },
      width: '520px',
    });
  }

  private async handleStatusChange(bookingId: number, newStatus: BookingStatus): Promise<void> {
    try {
      await firstValueFrom(this.bookingService.updateBookingStatus(bookingId, newStatus));
      const label = newStatus === BookingStatus.Active ? 'aktiverad' : 'avbokad';
      this.toastService.showSuccess(`Bokningen har ${label}.`);
      this.modalService.close();
      this.bookingsResource.reload();
    } catch (err) {
      console.error('Failed updating booking status', err);
      this.toastService.showError('Kunde inte uppdatera bokningens status.');
      throw err;
    }
  }
}
