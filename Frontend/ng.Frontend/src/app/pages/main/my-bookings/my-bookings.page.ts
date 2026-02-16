import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PanelComponent } from '../../../shared/components/panel/panel.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { RoomService } from '../../../shared/services/room.service';
import { BookingService } from '../../../shared/services/booking.service';
import { SessionService } from '../../../core/session.service';
import { BookingDetailedReadModel, BookingStatus, RoomResponseDto } from '../../../models/models';

@Component({
  selector: 'app-my-bookings-page',
  standalone: true,
  imports: [DatePipe, ButtonComponent, PanelComponent, CardComponent],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);
  private readonly sessionService = inject(SessionService);

  // --- STATE ---
  activeTab = signal<'upcoming' | 'history'>('upcoming');
  showCancelled = signal<boolean>(false);

  // --- RESOURCES ---

  // Rooms
  roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms())
  });

  // Bookings (Reactive to User)
  bookingsResource = resource({
    loader: () => {
      const user = this.sessionService.currentUser();
      if (!user?.id) return Promise.resolve([]);
      // Use the new service method that calls /my-owned
      return firstValueFrom(this.bookingService.getBookingsByUserId(user.id));
    }
  });

  // --- COMPUTED (The "Brain") ---

  filteredBookings = computed(() => {
    const all = this.bookingsResource.value() ?? [];
    const tab = this.activeTab();
    const showCancelled = this.showCancelled();
    const now = new Date();

    return all
      .filter((b) => {
        // Fallback for potentially undefined endTime
        const endTime = new Date(b.endTime ?? 0);
        // Use Enum instead of magic string (already imported)
        const isCancelled = b.status === BookingStatus.Cancelled;

        // 1. Toggle Filter
        if (!showCancelled && isCancelled) return false;

        // 2. Tab Filter
        // Upcoming = End time is in the future
        // History = End time is in the past
        const isHistory = endTime < now;

        if (tab === 'upcoming') {
           return !isHistory;
        } else {
           return isHistory;
        }
      })
      .sort((a, b) => {
        // Fallback for potentially undefined startTime
        const timeA = new Date(a.startTime ?? 0).getTime();
        const timeB = new Date(b.startTime ?? 0).getTime();
        // Upcoming: Ascending (soonest first)
        // History: Descending (newest first)
        return tab === 'upcoming' ? timeA - timeB : timeB - timeA;
      });
  });

  // --- ACTIONS ---

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  toggleCancelled(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.showCancelled.set(checked);
  }

  onBookRoom(room: RoomResponseDto) {
    console.log('Open booking modal for room:', room);
    // TODO: Implement Booking Modal
  }

  async onCancelBooking(booking: BookingDetailedReadModel) {
    if (!booking.bookingId) return;

    if (!confirm('Vill du avboka bokningen?')) return;

    try {
      await firstValueFrom(this.bookingService.cancelBooking(booking.bookingId));
      // Reload the resource to fetch fresh data
      this.bookingsResource.reload();
    } catch (error) {
      console.error('Failed to cancel booking', error);
      alert('Kunde inte avboka. Försök igen.');
    }
  }
}
