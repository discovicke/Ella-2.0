import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookingService } from '../../../shared/services/booking.service';
import { CreateBookingDto, RoomType, BookingStatus } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../shared/services/toast.service';

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
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './bookingform.component.html',
  styleUrl: './bookingform.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingformComponent {
  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);

  // Signal Forms - nytt API i Angular
  readonly bookingForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    selectedCity: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    selectedRoomId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  // Signals för formulärdata - uppdateras automatiskt när formuläret ändras
  readonly name = toSignal(this.bookingForm.controls.name.valueChanges, { initialValue: '' });
  readonly selectedCity = toSignal(this.bookingForm.controls.selectedCity.valueChanges, { initialValue: '' });
  readonly selectedRoomId = toSignal(this.bookingForm.controls.selectedRoomId.valueChanges, { initialValue: null });
  readonly startDate = toSignal(this.bookingForm.controls.startDate.valueChanges, { initialValue: '' });
  readonly startTime = toSignal(this.bookingForm.controls.startTime.valueChanges, { initialValue: '' });
  readonly endDate = toSignal(this.bookingForm.controls.endDate.valueChanges, { initialValue: '' });
  readonly endTime = toSignal(this.bookingForm.controls.endTime.valueChanges, { initialValue: '' });
  readonly notes = toSignal(this.bookingForm.controls.notes.valueChanges, { initialValue: '' });

  // Mockdata för städer
  readonly cities: City[] = [{ name: 'Hudiksvall' }, { name: 'Uppsala' }, { name: 'Stockholm' }];

  // Mockdata för rum
  readonly rooms: Room[] = [
    {
      id: 1,
      name: 'Lintjärn',
      city: 'Hudiksvall',
      capacity: 16,
      type: RoomType.ComputerLab,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 2, name: 'TV' },
        { id: 4, name: 'Projektor' },
        { id: 3, name: 'Nätverksutrustning' },
      ],
    },
    {
      id: 2,
      name: 'Lillfjärden',
      city: 'Hudiksvall',
      capacity: 22,
      type: RoomType.Classroom,
      assets: [{ id: 2, name: 'TV' }],
    },
    {
      id: 3,
      name: 'Personalrum',
      city: 'Uppsala',
      capacity: 10,
      type: RoomType.GroupRoom,
      assets: [{ id: 2, name: 'TV' }],
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
      ],
    },
    {
      id: 5,
      name: 'Kopparlab',
      city: 'Hudiksvall',
      capacity: 26,
      type: RoomType.Laboratory,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 4, name: 'Projektor' },
        { id: 5, name: 'Fiberutrustning' },
      ],
    },
    {
      id: 6,
      name: 'Fiberlab',
      city: 'Hudiksvall',
      capacity: 20,
      type: RoomType.Laboratory,
      assets: [
        { id: 1, name: 'Whiteboard' },
        { id: 4, name: 'Projektor' },
        { id: 5, name: 'Fiberutrustning' },
      ],
    },
  ];

  // Expanded rooms i listan (för collapsable)
  readonly expandedRooms = signal<Set<number>>(new Set());

  // Computed: filtrerade rum baserat på vald stad
  readonly filteredRooms = computed(() => {
    const city = this.selectedCity();
    if (!city) return [];
    return this.rooms.filter((room) => room.city === city);
  });

  // Signal för formulärets status
  readonly formStatus = toSignal(this.bookingForm.statusChanges, { initialValue: 'INVALID' });

  // Computed: formulärvalidering
  readonly isFormValid = computed(() => {
    return this.formStatus() === 'VALID';
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
    this.bookingForm.controls.selectedRoomId.setValue(null);
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    const startDateTime = new Date(`${this.startDate()}T${this.startTime()}`);
    const endDateTime = new Date(`${this.endDate()}T${this.endTime()}`);

    // Slå ihop namn och anteckningar
    const combinedNotes = `Namn: ${this.name()}${
      this.notes() ? '\nAnteckningar: ' + this.notes() : ''
    }`;

    const booking: CreateBookingDto = {
      userId: 1, // Mock userId
      roomId: this.selectedRoomId()!,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: combinedNotes,
      status: BookingStatus.Active,
    };

    this.bookingService.createBooking(booking).subscribe({
      next: () => {
        this.toastService.showSuccess('Bokning skapad!');
        this.resetForm();
      },
      error: (err) => {
        console.error('Fel vid bokning:', err);
        this.toastService.showError('Något gick fel vid bokningen.');
      },
    });
  }

  private resetForm(): void {
    this.bookingForm.reset();
  }
}
