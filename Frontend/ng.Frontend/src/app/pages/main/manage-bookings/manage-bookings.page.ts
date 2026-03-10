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
import {
  BookingDetailedReadModel,
  BookingStatus,
  GroupedPagedResultOfBookingDetailedReadModel,
} from '../../../models/models';
import { BookingService, BookingPagedFilterParams } from '../../../shared/services/booking.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BookingEditModalComponent } from './booking-edit-modal.component';
import { RoomService } from '../../../shared/services/room.service';
import { DayPilot } from '@daypilot/daypilot-lite-angular';
import { BookingModalComponent } from '../book-room/booking-modal/booking-modal.component';

import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';

export type ViewMode = 'today' | 'week' | 'month' | 'all' | 'room' | 'user' | 'campus' | 'calendar';
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
  imports: [DatePipe, CalendarComponent],
  templateUrl: './manage-bookings.page.html',
  styleUrl: './manage-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageBookingsPage {
  protected readonly BookingStatus = BookingStatus;
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);
  private readonly roomService = inject(RoomService);

  // --- Booking form kill switch ---
  readonly isBookingFormEnabled = signal<boolean | null>(null);
  readonly isTogglingForm = signal(false);

  // --- Pending count ---
  readonly pendingCount = signal(0);

  // --- Rooms (for resource scheduler) ---
  readonly roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms()),
  });

  readonly calendarResources = computed<DayPilot.ResourceData[]>(() =>
    (this.roomsResource.value() ?? []).map(r => ({
      id: r.roomId!.toString(),
      name: r.name || 'Okänt rum',
    }))
  );

  constructor() {
    this.loadFormStatus();
    this.loadPendingCount();
  }

  private loadFormStatus(): void {
    this.bookingService.getFormStatus().subscribe({
      next: (res) => this.isBookingFormEnabled.set(res.enabled),
      error: () => this.isBookingFormEnabled.set(null),
    });
  }

  toggleBookingForm(): void {
    this.isTogglingForm.set(true);
    this.bookingService.toggleForm().subscribe({
      next: (res) => {
        this.isBookingFormEnabled.set(res.enabled);
        this.isTogglingForm.set(false);
        const label = res.enabled ? 'aktiverat' : 'inaktiverat';
        this.toastService.showSuccess(`Bokningsformulär ${label}.`);
      },
      error: () => {
        this.isTogglingForm.set(false);
        this.toastService.showError('Kunde inte ändra formulärstatus.');
      },
    });
  }

  private loadPendingCount(): void {
    this.bookingService.getAllBookings({ status: BookingStatus.Pending, pageSize: 1 }).subscribe({
      next: (res) => this.pendingCount.set(res.totalCount),
      error: () => this.pendingCount.set(0),
    });
  }

  filterPending(): void {
    this.selectedStatus.set(BookingStatus.Pending);
    this.viewMode.set('all');
    this.pageIndex.set(0);
  }

  // --- Filter state ---
  searchQuery = signal('');
  debouncedSearch = signal('');
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  selectedStatus = signal<BookingStatus | 'All'>(BookingStatus.Active);
  viewMode = signal<ViewMode>('calendar');
  calendarDate = signal<Date>(new Date());
  /** Sticky preference: should groups default to collapsed? Survives filter/page changes. */
  defaultCollapsed = signal(false);
  /** Per-group overrides that differ from the default. Reset on filter/page change. */
  private groupOverrides = signal<Set<string>>(new Set());
  pageIndex = signal(0);

  /**
   * Groups per page sent to the server.
   * Date-bounded views (today/week/month) use a high limit so all groups load at once.
   * Unbounded views paginate by groups (10 groups per page).
   */
  readonly groupsPerPage = computed(() => {
    const range = this.selectedDateRange();
    return range === 'all' ? 10 : 1_000;
  });

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
      case 'calendar':
        return 'today'; // resource scheduler shows one day; bounds derived from calendarDate
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
      case 'calendar':
        return 'day'; // resource scheduler: if list view is ever shown, group by day
      case 'all':
        return 'month';
      default:
        return vm as GroupByMode; // 'room' | 'user' | 'campus'
    }
  });

  private getDateBounds(range: DateRange): { start: Date; end: Date } | null {
    if (this.viewMode() === 'calendar') {
      // Resource scheduler shows one day at a time — load only that day's bookings
      const d = this.calendarDate();
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      return { start, end };
    }

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

  readonly dateBounds = computed(() => this.getDateBounds(this.selectedDateRange()));

  // --- Resource (server-side group-aware pagination) ---
  bookingsResource = resource({
    params: () => ({
      page: this.pageIndex() + 1,
      groupsPerPage: this.groupsPerPage(),
      search: this.debouncedSearch(),
      status: this.selectedStatus(),
      bounds: this.dateBounds(),
      groupBy: this.groupBy(),
    }),
    loader: ({ params }) => {
      const p: BookingPagedFilterParams = {
        page: params.page,
        pageSize: params.groupsPerPage,
        groupBy: params.groupBy,
      };
      if (params.search) p.search = params.search;
      if (params.status !== 'All') p.status = params.status;
      if (params.bounds) {
        p.startDate = params.bounds.start.toISOString();
        p.endDate = params.bounds.end.toISOString();
      }
      return firstValueFrom(this.bookingService.getGroupedBookings(p));
    },
  });

  // Keep previous data visible while loading to avoid flash
  private lastBookings: BookingDetailedReadModel[] = [];
  private lastTotalGroups = 0;
  private lastTotalBookings = 0;

  readonly bookings = computed(() => {
    const val = this.bookingsResource.value();
    if (val) {
      this.lastBookings = val.items;
      this.lastTotalGroups = val.totalGroups;
      this.lastTotalBookings = val.totalItemCount;
    }
    return this.lastBookings;
  });
  readonly totalGroups = computed(() => {
    const val = this.bookingsResource.value();
    if (val) return val.totalGroups;
    return this.lastTotalGroups;
  });
  readonly totalBookings = computed(() => {
    const val = this.bookingsResource.value();
    if (val) return val.totalItemCount;
    return this.lastTotalBookings;
  });
  readonly totalPages = computed(() => Math.ceil(this.totalGroups() / this.groupsPerPage()));

  /** Returns page indices to render, with -1 as ellipsis placeholder. Max ~7 buttons. */
  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.pageIndex();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const pages: number[] = [];
    pages.push(0);
    if (current > 2) pages.push(-1);
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 3) pages.push(-1);
    pages.push(total - 1);
    return pages;
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery() !== '' ||
      this.selectedStatus() !== BookingStatus.Active ||
      (this.viewMode() !== 'calendar' && this.viewMode() !== 'week'),
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
    const bookings = this.bookings();
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

  // --- Filter actions ---
  updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.debouncedSearch.set(value);
      this.pageIndex.set(0);
    }, 300);
  }

  updateStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as BookingStatus | 'All');
    this.pageIndex.set(0);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.debouncedSearch.set('');
    this.selectedStatus.set(BookingStatus.Active);
    this.viewMode.set('calendar');
    this.calendarDate.set(new Date());
    this.pageIndex.set(0);
    clearTimeout(this.searchDebounceTimer);
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.pageIndex.set(0);
    this.groupOverrides.set(new Set());
  }

  onCalendarDateChange(date: Date): void {
    this.calendarDate.set(date);
  }

  toggleGroupCollapse(key: string): void {
    const current = new Set(this.groupOverrides());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.groupOverrides.set(current);
  }

  isGroupCollapsed(key: string): boolean {
    const overridden = this.groupOverrides().has(key);
    return overridden ? !this.defaultCollapsed() : this.defaultCollapsed();
  }

  toggleAllCollapse(): void {
    this.defaultCollapsed.update((v) => !v);
    this.groupOverrides.set(new Set());
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
      case BookingStatus.Pending:
        return 'Väntande';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '—';
    }
  }

  onTimeRangeSelected(event: { start: Date; end: Date; resourceId?: number }): void {
    if (event.resourceId === undefined) return;
    const resourceIdStr = event.resourceId.toString();
    const rooms = this.roomsResource.value() ?? [];
    const room = rooms.find(r => r.roomId?.toString() === resourceIdStr);
    if (!room) return;

    this.modalService.open(BookingModalComponent, {
      title: `Boka ${room.name}`,
      data: {
        ...room,
        prefillStart: event.start,
        prefillEnd: event.end,
        onBookingCreated: () => this.bookingsResource.reload(),
      },
      width: '600px',
    });
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
        onCancelWithScope: (bookingId: number, scope: 'single' | 'thisAndFollowing' | 'all') =>
          this.handleCancelWithScope(bookingId, scope),
        onDetailsUpdated: () => this.bookingsResource.reload(),
      },
      width: '520px',
    });
  }

  private async handleStatusChange(bookingId: number, newStatus: BookingStatus): Promise<void> {
    try {
      await firstValueFrom(this.bookingService.updateBookingStatus(bookingId, newStatus));
      let label: string;
      if (newStatus === BookingStatus.Active) label = 'godkänts';
      else if (newStatus === BookingStatus.Cancelled) label = 'nekats';
      else label = 'uppdaterad';
      this.toastService.showSuccess(`Bokningen har ${label}.`);
      this.modalService.close();
      this.bookingsResource.reload();
      this.loadPendingCount();
    } catch (err) {
      console.error('Failed updating booking status', err);
      this.toastService.showError('Kunde inte uppdatera bokningens status.');
      throw err;
    }
  }

  private async handleCancelWithScope(bookingId: number, scope: 'single' | 'thisAndFollowing' | 'all'): Promise<void> {
    try {
      const result = await firstValueFrom(this.bookingService.cancelWithScope(bookingId, scope));
      const label = scope === 'all' ? 'Hela serien' : scope === 'thisAndFollowing' ? 'Denna och kommande' : 'Bokningen';
      this.toastService.showSuccess(`${label} har avbokats (${result.cancelledCount} st).`);
      this.modalService.close();
      this.bookingsResource.reload();
      this.loadPendingCount();
    } catch (err) {
      console.error('Failed cancelling with scope', err);
      this.toastService.showError('Kunde inte avboka.');
      throw err;
    }
  }
}
