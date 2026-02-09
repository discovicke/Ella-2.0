import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../shared/services/booking.service';
import { CreateBookingDto, RoomType } from '../../../api/models';

interface Asset {
  id: number;
  name: string;
}

interface Room {
  id: number;
  name: string;
  city: string;
  capacity: number;
  type: RoomType;
  assets: Asset[];
}

interface City {
  name: string;
}

@Component({
  selector: 'app-bookingform',
  imports: [FormsModule],
  templateUrl: './bookingform.component.html',
  styleUrl: './bookingform.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingformComponent {
  private readonly bookingService = inject(BookingService);

  // Mockdata för städer
  readonly cities: City[] = [
    { name: 'Hudiksvall' },
    { name: 'Uppsala' },
    { name: 'Stockholm' },
  ];

  // Mockdata för rum
  readonly rooms: Room[] = [
    {
      id: 1,
      name: 'Sal A101',
      city: 'Hudiksvall',
      capacity: 30,
      type: RoomType.Classroom,
      assets: [
        { id: 1, name: 'Projektor' },
        { id: 2, name: 'Whiteboard' },
      ],
    },
    {
      id: 2,
      name: 'Lab B202',
      city: 'Hudiksvall',
      capacity: 20,
      type: RoomType.Laboratory,
      assets: [
        { id: 3, name: 'Mikroskop' },
        { id: 4, name: 'Labbänkar' },
        { id: 5, name: 'Ventilation' },
      ],
    },
    {
      id: 3,
      name: 'Grupprum G1',
      city: 'Hudiksvall',
      capacity: 8,
      type: RoomType.GroupRoom,
      assets: [
        { id: 6, name: 'Whiteboard' },
        { id: 7, name: 'TV-skärm' },
      ],
    },
    {
      id: 4,
      name: 'Datasal D101',
      city: 'Uppsala',
      capacity: 25,
      type: RoomType.ComputerLab,
      assets: [
        { id: 8, name: 'Datorer' },
        { id: 9, name: 'Projektor' },
        { id: 10, name: 'Skrivare' },
      ],
    },
    {
      id: 5,
      name: 'Föreläsningssal F1',
      city: 'Uppsala',
      capacity: 100,
      type: RoomType.Classroom,
      assets: [
        { id: 11, name: 'Projektor' },
        { id: 12, name: 'Mikrofon' },
        { id: 13, name: 'Högtalarystem' },
      ],
    },
    {
      id: 6,
      name: 'Studiecenter',
      city: 'Stockholm',
      capacity: 50,
      type: RoomType.GroupRoom,
      assets: [
        { id: 14, name: 'Soffgrupper' },
        { id: 15, name: 'Kaffemaskin' },
      ],
    },
    {
      id: 7,
      name: 'Kemilab K1',
      city: 'Stockholm',
      capacity: 15,
      type: RoomType.Laboratory,
      assets: [
        { id: 16, name: 'Dragskåp' },
        { id: 17, name: 'Kemikalieförråd' },
        { id: 18, name: 'Nöddusch' },
      ],
    },
  ];

  // Formulärfält
  readonly name = signal('');
  readonly selectedCity = signal('');
  readonly selectedRoomId = signal<number | null>(null);
  readonly startDate = signal('');
  readonly startTime = signal('');
  readonly endDate = signal('');
  readonly endTime = signal('');
  readonly notes = signal('');

  // Expanded rooms i listan (för collapsable)
  readonly expandedRooms = signal<Set<number>>(new Set());

  // Computed: filtrerade rum baserat på vald stad
  readonly filteredRooms = computed(() => {
    const city = this.selectedCity();
    if (!city) return [];
    return this.rooms.filter(room => room.city === city);
  });


  // Computed: formulärvalidering
  readonly isFormValid = computed(() => {
    return (
      this.name().trim() !== '' &&
      this.selectedCity() !== '' &&
      this.selectedRoomId() !== null &&
      this.startDate() !== '' &&
      this.startTime() !== '' &&
      this.endDate() !== '' &&
      this.endTime() !== ''
    );
  });

  toggleRoom(roomId: number): void {
    const expanded = new Set(this.expandedRooms());
    if (expanded.has(roomId)) {
      expanded.delete(roomId);
    } else {
      expanded.add(roomId);
    }
    this.expandedRooms.set(expanded);
  }

  isRoomExpanded(roomId: number): boolean {
    return this.expandedRooms().has(roomId);
  }

  getRoomTypeLabel(type: RoomType): string {
    switch (type) {
      case RoomType.Classroom:
        return 'Klassrum';
      case RoomType.Laboratory:
        return 'Laboratorium';
      case RoomType.GroupRoom:
        return 'Grupprum';
      case RoomType.ComputerLab:
        return 'Datasal';
      default:
        return type;
    }
  }

  onCityChange(): void {
    // Återställ valt rum när stad ändras
    this.selectedRoomId.set(null);
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    const startDateTime = new Date(`${this.startDate()}T${this.startTime()}`);
    const endDateTime = new Date(`${this.endDate()}T${this.endTime()}`);

    // Slå ihop namn och anteckningar
    const combinedNotes = `Namn: ${this.name()}${this.notes() ? '\nAnteckningar: ' + this.notes() : ''}`;

    const booking: CreateBookingDto = {
      userId: 1, // Mock userId
      roomId: this.selectedRoomId()!,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: combinedNotes,
      status: 0,
    };

    this.bookingService.createBooking(booking).subscribe({
      next: () => {
        alert('Bokning skapad!');
        this.resetForm();
      },
      error: (err) => {
        console.error('Fel vid bokning:', err);
        alert('Något gick fel vid bokningen.');
      },
    });
  }

  private resetForm(): void {
    this.name.set('');
    this.selectedCity.set('');
    this.selectedRoomId.set(null);
    this.startDate.set('');
    this.startTime.set('');
    this.endDate.set('');
    this.endTime.set('');
    this.notes.set('');
  }
}
