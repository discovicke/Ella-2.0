import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BookingService } from '../../../shared/services/booking.service';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import {
  BookingDetailModalComponent,
  BookingDetailModalConfig,
} from './booking-detail-modal.component';

interface BookingGroup {
  label: string;
  key: string;
  bookings: BookingDetailedReadModel[];
}

@Component({
  selector: 'app-see-bookings-page',
  imports: [DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './see-bookings.page.html',
  styleUrl: './see-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeeBookingsPage {
  protected readonly BookingStatus = BookingStatus;
  private readonly confirmService = inject(ConfirmService);
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  // --- STATE ---
  activeTab = signal<'upcoming' | 'history'>('upcoming');
  showCancelled = signal<boolean>(false);

  // Accumulated bookings across pages (load-more pattern)
  bookings = signal<BookingDetailedReadModel[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  isLoading = signal<boolean>(false);
  private readonly PAGE_SIZE = 8;

  constructor() {
    // Auto-fetch when tab or showCancelled changes
    effect(() => {
      const _tab = this.activeTab();
      const _cancelled = this.showCancelled();
      untracked(() => this.loadBookings(true));
    });
  }

  // --- COMPUTED ---

  hasMore = computed(() => this.bookings().length < this.totalCount());

  /** The soonest upcoming active booking — used for the hero card */
  nextBooking = computed(() => {
    if (this.activeTab() !== 'upcoming') return null;
    // Server returns upcoming in ASC order, so first active is soonest
    return this.bookings().find((b) => b.status === BookingStatus.Active) ?? null;
  });

  groupedBookings = computed(() => {
    const bookings = this.bookings();
    const tab = this.activeTab();

    if (tab === 'upcoming') {
      return this.groupUpcomingBookings(bookings);
    } else {
      return this.groupHistoryBookings(bookings);
    }
  });

  // --- HELPERS ---

  parseAssets(assetsStr: string | null | undefined): string[] {
    if (!assetsStr) return [];
    return assetsStr.split('|||').filter((a) => a.trim().length > 0);
  }

  getCountdownLabel(booking: BookingDetailedReadModel): string {
    const now = new Date();
    const start = new Date(booking.startTime ?? 0);
    const diffMs = start.getTime() - now.getTime();

    if (diffMs <= 0) return 'Pågår nu';

    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `Startar om ${mins}m`;

    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours < 24) {
      return remainMins > 0 ? `Startar om ${hours}h ${remainMins}m` : `Startar om ${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return days === 1 ? 'Startar imorgon' : `Startar om ${days} dagar`;
  }

  statusLabel(status: BookingStatus | undefined): string {
    switch (status) {
      case BookingStatus.Active:
        return 'Aktiv';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '';
    }
  }

  private groupUpcomingBookings(bookings: BookingDetailedReadModel[]): BookingGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    const groups: BookingGroup[] = [
      { label: 'Idag', key: 'today', bookings: [] },
      { label: 'Imorgon', key: 'tomorrow', bookings: [] },
      { label: 'Denna vecka', key: 'this-week', bookings: [] },
      { label: 'Nästa vecka', key: 'next-week', bookings: [] },
      { label: 'Senare', key: 'later', bookings: [] },
    ];

    for (const booking of bookings) {
      const d = new Date(booking.startTime ?? 0);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const t = day.getTime();

      if (t === today.getTime()) {
        groups[0].bookings.push(booking);
      } else if (t === tomorrow.getTime()) {
        groups[1].bookings.push(booking);
      } else if (t > tomorrow.getTime() && t < endOfWeek.getTime()) {
        groups[2].bookings.push(booking);
      } else if (t >= endOfWeek.getTime() && t < endOfNextWeek.getTime()) {
        groups[3].bookings.push(booking);
      } else {
        groups[4].bookings.push(booking);
      }
    }

    return groups.filter((g) => g.bookings.length > 0);
  }

  private groupHistoryBookings(bookings: BookingDetailedReadModel[]): BookingGroup[] {
    const groupMap = new Map<string, BookingDetailedReadModel[]>();

    for (const booking of bookings) {
      const date = new Date(booking.startTime ?? 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, []);
      }
      groupMap.get(monthKey)!.push(booking);
    }

    const groups: BookingGroup[] = [];
    groupMap.forEach((items, key) => {
      const date = new Date(items[0].startTime ?? 0);
      const label = date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });

      groups.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        key,
        bookings: items,
      });
    });

    return groups;
  }

  // --- ACTIONS ---

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  toggleCancelled(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.showCancelled.set(checked);
  }

  async loadBookings(reset: boolean) {
    if (reset) {
      this.currentPage.set(1);
      this.bookings.set([]);
      this.totalCount.set(0);
    }

    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.bookingService.getBookingsByUserId({
          page: this.currentPage(),
          pageSize: this.PAGE_SIZE,
          timeFilter: this.activeTab(),
          includeCancelled: this.showCancelled(),
        }),
      );

      if (reset) {
        this.bookings.set(result.items);
      } else {
        this.bookings.update((prev) => [...prev, ...result.items]);
      }
      this.totalCount.set(result.totalCount);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  loadMore() {
    this.currentPage.update((p) => p + 1);
    this.loadBookings(false);
  }

  openBookingDetail(booking: BookingDetailedReadModel): void {
    this.modalService.open(BookingDetailModalComponent, {
      title: 'Bokningsdetaljer',
      data: {
        booking,
        onCancel: async (bookingId: number) => {
          const confirmed = await this.confirmService.show('Vill du avboka bokningen?', {
            title: 'Avboka bokning',
            icon: 'warning' as const,
            confirmText: 'Avboka',
            cancelText: 'Behåll',
            dangerConfirm: true,
          });
          if (!confirmed) return;

          await firstValueFrom(this.bookingService.cancelBooking(bookingId));
          this.modalService.close();
          this.loadBookings(true);
        },
      } satisfies BookingDetailModalConfig,
      width: '480px',
    });
  }

  async onCancelBooking(booking: BookingDetailedReadModel, event?: Event) {
    event?.stopPropagation();
    if (!booking.bookingId) return;
    if (booking.status !== BookingStatus.Active) return;

    const confirmed = await this.confirmService.show('Vill du avboka bokningen?', {
      title: 'Avboka bokning',
      icon: 'warning' as const,
      confirmText: 'Avboka',
      cancelText: 'Behåll',
      dangerConfirm: true,
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.bookingService.cancelBooking(booking.bookingId));
      this.loadBookings(true);
    } catch (error) {
      console.error('Failed to cancel booking', error);
      this.toastService.showError('Kunde inte avboka. Försök igen.');
    }
  }
}
