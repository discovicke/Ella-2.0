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
      name: 'Lintjärn',
      city: 'Hudiksvall',
      capacity: 16,
      type: RoomType.ComputerLab,
      assets: [
        { id: 1, name: 'Whiteboard'},
        { id: 2, name: 'TV' },
        { id: 4, name: 'Projektor' },
        { id: 3, name: 'Nätverksutrustning'},
      ],
    },
    {
      id: 2,
      name: 'Lillfjärden',
      city: 'Hudiksvall',
      capacity: 22,
      type: RoomType.Classroom,
      assets: [
        { id: 2, name: 'TV' },
      ],
    },
    {
      id: 3,
      name: 'Personalrum',
      city: 'Uppsala',
      capacity: 10,
      type: RoomType.GroupRoom,
      assets: [
        { id: 2, name: 'TV' },
      ]
    },
    {
      id: 4,
      name: 'Dellen',
      city: 'Hudiksvall',
      capacity: 24,
      type: RoomType.Classroom,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 2, name: 'TV' },
        { id: 3, name: 'Projektor' },
      ]
    },
    {
      id: 5,
      name: 'Kopparlab',
      city: 'Hudiksvall',
      capacity: 26,
      type: RoomType.Laboratory,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 4, name: 'Projektor'},
        { id: 5, name: 'Fiberutrustning'}
      ]
    },
    {
      id: 6,
      name: 'Fiberlab',
      city: 'Hudiksvall',
      capacity: 20,
      type: RoomType.Laboratory,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 4, name: 'Projektor'},
        { id: 5, name: 'Fiberutrustning'}
      ]
    }
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
    const combinedNotes = `Namn: ${this.name()}${this.notes()
      ? '\nAnteckningar: ' + this.notes()
      : ''}`;

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
