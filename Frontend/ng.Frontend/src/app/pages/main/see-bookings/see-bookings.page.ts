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

interface BookingGroup {
  label: string;
  date: string;
  bookings: BookingDetailedReadModel[];
}

@Component({
  selector: 'app-see-bookings-page',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './see-bookings.page.html',
  styleUrl: './see-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeeBookingsPage {
  private readonly bookingService = inject(BookingService);
  private readonly sessionService = inject(SessionService);

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

        // 1. Toggle Filter
        if (!showCancelled && isCancelled) return false;

        // 2. Tab Filter
        const isHistory = endTime < now;

        if (tab === 'upcoming') {
          return !isHistory;
        } else {
          return isHistory;
        }
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime ?? 0).getTime();
        const timeB = new Date(b.startTime ?? 0).getTime();
        return tab === 'upcoming' ? timeA - timeB : timeB - timeA;
      });
  });

  upcomingBookings = computed(() => {
    const all = this.bookingsResource.value() ?? [];
    const showCancelled = this.showCancelled();
    const now = new Date();

    return all.filter((b) => {
      const endTime = new Date(b.endTime ?? 0);
      const isCancelled = b.status === BookingStatus.Cancelled;
      const isUpcoming = endTime >= now;

      if (!showCancelled && isCancelled) return false;
      return isUpcoming;
    });
  });

  groupedBookings = computed(() => {
    const bookings = this.filteredBookings();
    const tab = this.activeTab();
    const groups: BookingGroup[] = [];

    if (tab === 'upcoming') {
      return this.groupUpcomingBookings(bookings);
    } else {
      return this.groupHistoryBookings(bookings);
    }
  });

  private groupUpcomingBookings(bookings: BookingDetailedReadModel[]): BookingGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups: BookingGroup[] = [
      { label: 'Idag', date: today.toISOString(), bookings: [] },
      { label: 'Imorgon', date: tomorrow.toISOString(), bookings: [] },
      { label: 'Denna vecka', date: today.toISOString(), bookings: [] },
      { label: 'Nästa vecka', date: nextWeek.toISOString(), bookings: [] },
      { label: 'Senare', date: '', bookings: [] },
    ];

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.startTime ?? 0);
      const bookingDay = new Date(
        bookingDate.getFullYear(),
        bookingDate.getMonth(),
        bookingDate.getDate(),
      );

      if (bookingDay.getTime() === today.getTime()) {
        groups[0].bookings.push(booking);
      } else if (bookingDay.getTime() === tomorrow.getTime()) {
        groups[1].bookings.push(booking);
      } else if (bookingDay > tomorrow && bookingDay < nextWeek) {
        groups[2].bookings.push(booking);
      } else if (
        bookingDay >= nextWeek &&
        bookingDay.getTime() < nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000
      ) {
        groups[3].bookings.push(booking);
      } else {
        groups[4].bookings.push(booking);
      }
    });

    return groups.filter((g) => g.bookings.length > 0);
  }

  private groupHistoryBookings(bookings: BookingDetailedReadModel[]): BookingGroup[] {
    const groupMap = new Map<string, BookingDetailedReadModel[]>();

    bookings.forEach((booking) => {
      const date = new Date(booking.startTime ?? 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });

      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, []);
      }
      groupMap.get(monthKey)!.push(booking);
    });

    const groups: BookingGroup[] = [];
    groupMap.forEach((bookings, key) => {
      const firstBooking = bookings[0];
      const date = new Date(firstBooking.startTime ?? 0);
      const label = date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });

      groups.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        date: key,
        bookings: bookings,
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

  getUpcomingCount(): number {
    return this.upcomingBookings().length;
  }

  async onCancelBooking(booking: BookingDetailedReadModel) {
    if (!booking.bookingId) return;

    if (!confirm('Vill du avboka bokningen?')) return;

    try {
      await firstValueFrom(this.bookingService.cancelBooking(booking.bookingId));
      this.bookingsResource.reload();
    } catch (error) {
      console.error('Failed to cancel booking', error);
      alert('Kunde inte avboka. Försök igen.');
    }
  }
}
