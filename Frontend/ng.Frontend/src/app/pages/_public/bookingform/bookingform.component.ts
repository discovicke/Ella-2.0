import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PublicBookingService } from '../../../shared/services/public-booking.service';
import {
  BookingStatus,
  CreateBookingDto,
  RoomDetailModel,
  CampusResponseDto,
} from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-bookingform',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './bookingform.component.html',
  styleUrl: './bookingform.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingformComponent implements OnInit {
  private readonly publicBookingService = inject(PublicBookingService);
  private readonly toastService = inject(ToastService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  // --- State signals ---
  readonly rooms = signal<RoomDetailModel[]>([]);
  readonly campuses = signal<CampusResponseDto[]>([]);
  readonly isFormEnabled = signal(true);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly bookingSlug = signal<string | null>(null);
  readonly userDisplayName = signal<string | null>(null);

  // --- Form ---
  readonly bookingForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    selectedCity: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    selectedRoomId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', {
      nonNullable: true,
    }),
  });

  // Signals from form controls
  readonly name = toSignal(this.bookingForm.controls.name.valueChanges, { initialValue: '' });
  readonly selectedCity = toSignal(this.bookingForm.controls.selectedCity.valueChanges, {
    initialValue: '',
  });
  readonly selectedRoomId = toSignal(this.bookingForm.controls.selectedRoomId.valueChanges, {
    initialValue: null,
  });
  readonly startDate = toSignal(this.bookingForm.controls.startDate.valueChanges, {
    initialValue: '',
  });
  readonly startTime = toSignal(this.bookingForm.controls.startTime.valueChanges, {
    initialValue: '',
  });
  readonly endDate = toSignal(this.bookingForm.controls.endDate.valueChanges, { initialValue: '' });
  readonly endTime = toSignal(this.bookingForm.controls.endTime.valueChanges, { initialValue: '' });
  readonly notes = toSignal(this.bookingForm.controls.notes.valueChanges, { initialValue: '' });

  // --- Computed: unique cities from real campus data ---
  readonly cities = computed(() => {
    const citySet = new Set(this.campuses().map((c) => c.city));
    return [...citySet].sort();
  });

  // --- Computed: rooms filtered by selected city ---
  readonly filteredRooms = computed(() => {
    const city = this.selectedCity();
    if (!city) return [];
    return this.rooms().filter((room) => room.campusCity === city);
  });

  // Expanded rooms for collapsible list
  readonly expandedRooms = signal<Set<number>>(new Set());

  // Form status
  readonly formStatus = toSignal(this.bookingForm.statusChanges, { initialValue: 'INVALID' });
  readonly isFormValid = computed(() => this.formStatus() === 'VALID');

  // Time validation error
  readonly timeError = computed(() => {
    const sd = this.startDate();
    const st = this.startTime();
    const ed = this.endDate();
    const et = this.endTime();
    if (!sd || !st || !ed || !et) return null;
    const start = new Date(`${sd}T${st}`);
    const end = new Date(`${ed}T${et}`);
    if (end <= start) return 'Sluttid måste vara efter starttid.';
    return null;
  });

  // Today's date as default for date inputs
  readonly today = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    const slug = this.route.snapshot.queryParamMap.get('slug');
    if (slug) {
      this.bookingSlug.set(slug);
      this.verifySlug(slug);
    }

    this.loadData();
    // Set default dates to today
    this.bookingForm.controls.startDate.setValue(this.today);
    this.bookingForm.controls.endDate.setValue(this.today);
  }

  private verifySlug(slug: string): void {
    this.http.get<{ userDisplayName: string }>(`/api/public/booking-slugs/${slug}`).subscribe({
      next: (info) => {
        this.userDisplayName.set(info.userDisplayName);
        this.bookingForm.controls.name.setValue(info.userDisplayName);
        this.bookingForm.controls.name.disable();
      },
      error: () => {
        this.toastService.showError('Ogiltig eller inaktiv bokningslänk.');
        this.bookingSlug.set(null);
      }
    });
  }

  private loadData(): void {
    this.isLoading.set(true);

    // Load form status
    this.publicBookingService.getFormStatus().subscribe({
      next: (status) => {
        this.isFormEnabled.set(status.enabled);
        if (!status.enabled && !this.bookingSlug()) {
          this.bookingForm.disable();
        }
      },
      error: () => {
        if (!this.bookingSlug()) {
          this.isFormEnabled.set(false);
          this.bookingForm.disable();
        }
      },
    });

    // Load rooms
    this.publicBookingService.getRooms().subscribe({
      next: (rooms) => this.rooms.set(rooms),
      error: () => this.toastService.showError('Kunde inte ladda rum.'),
    });

    // Load campuses
    this.publicBookingService.getCampuses().subscribe({
      next: (campuses) => {
        this.campuses.set(campuses);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.showError('Kunde inte ladda campus.');
        this.isLoading.set(false);
      },
    });
  }

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

  getRoomTypeLabel(type: string): string {
    return type;
  }

  onCityChange(): void {
    this.bookingForm.controls.selectedRoomId.setValue(null);
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.timeError() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const startDateTime = new Date(`${this.startDate()}T${this.startTime()}`);
    const endDateTime = new Date(`${this.endDate()}T${this.endTime()}`);

    const slug = this.bookingSlug();
    const bookerName = this.userDisplayName() || this.name();
    const userNotes = this.notes();
    
    if (slug) {
      // Slug booking
      const payload = {
        roomId: this.selectedRoomId()!,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        notes: userNotes,
        bookerName: bookerName
      };

      this.http.post(`/api/public/booking-slugs/${slug}/book`, payload).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err)
      });
    } else {
      // Regular public booking
      const combinedNotes = userNotes ? `[${bookerName}] ${userNotes}` : `[${bookerName}]`;
      const dto: CreateBookingDto = {
        userId: 0,
        roomId: this.selectedRoomId()!,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        notes: combinedNotes,
        status: BookingStatus.Pending,
      };

      this.publicBookingService.createBooking(dto).subscribe({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleSuccess(): void {
    this.submitSuccess.set(true);
    this.toastService.showSuccess(
      this.bookingSlug() 
        ? 'Bokningen är genomförd!' 
        : 'Din bokningsförfrågan har skickats och inväntar godkännande!',
    );
    this.resetForm();
    this.isSubmitting.set(false);
  }

  private handleError(err: any): void {
    this.isSubmitting.set(false);
    const status = err.status;
    if (status === 403) {
      this.toastService.showError('Bokningsformuläret är tillfälligt stängt.');
      this.isFormEnabled.set(false);
      this.bookingForm.disable();
    } else if (status === 409) {
      this.toastService.showError('Rummet är redan bokat för den valda tiden.');
    } else if (status === 429) {
      this.toastService.showError('För många förfrågningar. Försök igen senare.');
    } else {
      this.toastService.showError('Något gick fel vid bokningen.');
    }
  }

  private resetForm(): void {
    this.bookingForm.reset({
      startDate: this.today,
      endDate: this.today,
    });
    if (this.bookingSlug()) {
      this.bookingForm.controls.name.setValue(this.userDisplayName() || '');
      this.bookingForm.controls.name.disable();
    }
  }
}
