import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BookingService } from '../../../shared/services/booking.service';
import { SessionService } from '../../../core/session.service';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ModalService } from '../../../shared/services/modal.service';
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
  private readonly confirmService = inject(ConfirmService);
  private readonly bookingService = inject(BookingService);
  private readonly sessionService = inject(SessionService);
  private readonly modalService = inject(ModalService);

  // --- STATE ---
  activeTab = signal<'upcoming' | 'history'>('upcoming');
  showCancelled = signal<boolean>(false);

  // --- RESOURCES ---
  bookingsResource = resource({
    loader: () => {
      const user = this.sessionService.currentUser();
      if (!user?.id) return Promise.resolve([]);
      return firstValueFrom(this.bookingService.getBookingsByUserId(user.id));
    },
  });

  // --- COMPUTED ---

  filteredBookings = computed(() => {
    const all = this.bookingsResource.value() ?? [];
    const tab = this.activeTab();
    const showCancelled = this.showCancelled();
    const now = new Date();

    return all
      .filter((b) => {
        const endTime = new Date(b.endTime ?? 0);
        const isCancelled = b.status === BookingStatus.Cancelled;

        if (!showCancelled && isCancelled) return false;

        const isHistory = endTime < now;
        return tab === 'upcoming' ? !isHistory : isHistory;
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime ?? 0).getTime();
        const timeB = new Date(b.startTime ?? 0).getTime();
        return tab === 'upcoming' ? timeA - timeB : timeB - timeA;
      });
  });

  upcomingCount = computed(() => {
    const all = this.bookingsResource.value() ?? [];
    const showCancelled = this.showCancelled();
    const now = new Date();

    return all.filter((b) => {
      const endTime = new Date(b.endTime ?? 0);
      if (!showCancelled && b.status === BookingStatus.Cancelled) return false;
      return endTime >= now;
    }).length;
  });

  /** The soonest upcoming active booking — used for the hero card */
  nextBooking = computed(() => {
    const all = this.bookingsResource.value() ?? [];
    const now = new Date();

    return (
      all
        .filter((b) => {
          const endTime = new Date(b.endTime ?? 0);
          return endTime >= now && b.status === BookingStatus.Active;
        })
        .sort((a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime())
        .at(0) ?? null
    );
  });

  groupedBookings = computed(() => {
    const bookings = this.filteredBookings();
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
          this.bookingsResource.reload();
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
      this.bookingsResource.reload();
    } catch (error) {
      console.error('Failed to cancel booking', error);
      alert('Kunde inte avboka. Försök igen.');
    }
  }
}
