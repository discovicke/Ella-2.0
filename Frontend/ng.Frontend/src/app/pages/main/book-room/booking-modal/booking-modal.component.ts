import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookingService } from '../../../../shared/services/booking.service';
import { ModalService } from '../../../../shared/services/modal.service';
import { SessionService } from '../../../../core/session.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CreateBookingDto, BookingStatus, RoomDetailModel } from '../../../../models/models';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './booking-modal.component.html',
  styleUrl: './booking-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingModalComponent {
  private readonly bookingService = inject(BookingService);
  protected readonly modalService = inject(ModalService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);

  // Get the room from modal data
  readonly room = this.modalService.modalData() as RoomDetailModel;

  // Set default dates (today)
  private readonly today = new Date().toISOString().split('T')[0];

  readonly bookingForm = new FormGroup({
    startDate: new FormControl(this.today, { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl(this.today, { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly isSubmitting = signal(false);

  onSubmit(): void {
    if (this.bookingForm.invalid) return;

    const user = this.sessionService.currentUser();
    if (!user) {
      this.toastService.showError('Du måste vara inloggad för att boka.');
      return;
    }

    this.isSubmitting.set(true);

    const startDateTime = new Date(`${this.bookingForm.value.startDate}T${this.bookingForm.value.startTime}`);
    const endDateTime = new Date(`${this.bookingForm.value.endDate}T${this.bookingForm.value.endTime}`);

    if (!this.room.roomId) {
      this.toastService.showError('Ogiltigt rum.');
      this.isSubmitting.set(false);
      return;
    }

    const booking: CreateBookingDto = {
      userId: user.id,
      roomId: this.room.roomId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: this.bookingForm.value.notes || '',
      status: BookingStatus.Active,
    };

    this.bookingService.createBooking(booking).subscribe({
      next: () => {
        this.toastService.showSuccess(`Bokning för ${this.room.name} skapad!`);
        this.modalService.close();
      },
      error: (err) => {
        console.error('Booking error:', err);
        this.toastService.showError('Kunde inte skapa bokning. Kontrollera tillgänglighet.');
        this.isSubmitting.set(false);
      },
    });
  }
}
