import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { RoomService } from '../../shared/services/room.service';
import { BookingService } from '../../shared/services/booking.service';
import { RoomResponseDto, BookingDetailedReadModel } from '../../models/models';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../shared/components/header/header.component';


@Component({
  selector: 'app-student-layout',
  imports: [DatePipe, ButtonComponent, PanelComponent, CardComponent, HeaderComponent],
  templateUrl: './student.layout.html',
  styleUrl: './student.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);

  activeTab = signal<'upcoming' | 'history'>('upcoming');

  // Resource för rum
  roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms())
  });

  // Resource för bokningar
  bookingsResource = resource({
    loader: () => firstValueFrom(this.bookingService.getBookings())
  });

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  onBookRoom(room: RoomResponseDto) {
    console.log('Open booking modal for room:', room);
  }
}
