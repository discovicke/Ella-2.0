import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { RoomService } from '../../shared/services/room.service';
import { BookingService } from '../../shared/services/booking.service';
import { RoomResponseDto, BookingDetailedReadModel } from '../../models/models';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, ButtonComponent, PanelComponent, CardComponent],
  templateUrl: './student.layout.html',
  styleUrl: './student.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);

  activeTab = signal<'upcoming' | 'history'>('upcoming');

  // Resource för rum
  roomsResource = rxResource({
    loader: () => this.roomService.getAllRooms()
  });

  // Resource för bokningar
  bookingsResource = rxResource({
    loader: () => this.bookingService.getBookings()
  });

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  onBookRoom(room: RoomResponseDto) {
    console.log('Open booking modal for room:', room);
    // Logik för extern modal kommer senare
  }
}
