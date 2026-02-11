import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PanelComponent } from '../../shared/components/panel/panel.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { RoomService } from '../../shared/services/room.service';
import { BookingService } from '../../shared/services/booking.service';
import { SessionService } from '../../core/session.service';
import { RoomResponseDto } from '../../models/models';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [DatePipe, ButtonComponent, PanelComponent, CardComponent, HeaderComponent],
  templateUrl: './student.layout.html',
  styleUrl: './student.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);
  private readonly sessionService = inject(SessionService);

  activeTab = signal<'upcoming' | 'history'>('upcoming');

  // Resource för rum
  roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms())
  });

  // Resource för bokningar
  // Genom att anropa sessionService.currentUser() inuti loadern
  // kommer resursen automatiskt att laddas om när användaren ändras.
  bookingsResource = resource({
    loader: () => {
      const user = this.sessionService.currentUser();
      if (!user?.id) return Promise.resolve([]);
      return firstValueFrom(this.bookingService.getBookingsByUserId(user.id));
    }
  });

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  onBookRoom(room: RoomResponseDto) {
    console.log('Open booking modal for room:', room);
  }
}
