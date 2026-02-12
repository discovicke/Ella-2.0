import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PanelComponent } from '../../../shared/components/panel/panel.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { RoomService } from '../../../shared/services/room.service';
import { BookingService } from '../../../shared/services/booking.service';
import { SessionService } from '../../../core/session.service';
import { RoomResponseDto } from '../../../models/models';

@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  imports: [DatePipe, ButtonComponent, PanelComponent, CardComponent],
  templateUrl: './student-dashboard.page.html',
  styleUrl: './student-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardPage {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);
  private readonly sessionService = inject(SessionService);

  // TODO: Implementera filtrering av bokningar baserat på status (aktiv, cancelled checkbox, historik)
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
    // TODO: Skapa en bokningsmodal som öppnas när man trycker på boka i studentvyn
    console.log('Open booking modal for room:', room);
  }
}
