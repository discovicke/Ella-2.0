import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResourceService } from '../../../core/services/resource.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { ResourceResponseDto, CreateResourceBookingDto } from '../../../models/models';
import { firstValueFrom } from 'rxjs';

export interface ResourceBookingModalData {
  resource: ResourceResponseDto;
  prefillStart?: Date;
  prefillEnd?: Date;
  onBookingCreated?: () => void;
}

@Component({
  selector: 'app-resource-booking-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    BadgeComponent,
    DatePickerComponent,
    TimePickerComponent,
  ],
  template: `
    <div class="booking-modal-container">
      <header class="form-card-header">
        <div class="hero-top">
          <app-badge variant="brand">{{ resource.categoryName }}</app-badge>
        </div>
        
        <h3 class="hero-room">Boka {{ resource.name }}</h3>
        
        <div class="hero-meta">
          <span class="hero-detail">{{ resource.campusCity }}</span>
          @if (resource.description) {
            <span class="meta-sep"></span>
            <span class="hero-detail">{{ resource.description }}</span>
          }
        </div>
      </header>

      <form [formGroup]="bookingForm" (ngSubmit)="submitBooking()" class="booking-form">
        <div class="form-body">
          <div class="form-group z-10">
            <label>Datum</label>
            <app-date-picker
              [value]="bookingForm.controls.date.value"
              (valueChange)="updateDate($event)"
            ></app-date-picker>
          </div>

          <div class="form-row">
            <div class="form-group z-9">
              <label>Starttid</label>
              <app-time-picker
                [value]="bookingForm.controls.startTime.value"
                (valueChange)="updateStartTime($event)"
              ></app-time-picker>
            </div>
            <div class="form-group z-8">
              <label>Sluttid</label>
              <app-time-picker
                [value]="bookingForm.controls.endTime.value"
                (valueChange)="updateEndTime($event)"
              ></app-time-picker>
            </div>
          </div>

          <div class="form-group z-1">
            <label>Noteringar</label>
            <textarea 
              formControlName="notes" 
              rows="3" 
              placeholder="Syfte med bokningen..."
              maxlength="500"
            ></textarea>
          </div>
        </div>

        <div class="form-footer">
          <app-button variant="tertiary" (clicked)="close()" type="button">Avbryt</app-button>
          <app-button type="submit" variant="primary" [disabled]="bookingForm.invalid || isSubmitting()">
            {{ isSubmitting() ? 'Bokar...' : 'Slutför bokning' }}
          </app-button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    @use 'styles/mixins' as *;

    .booking-modal-container {
      display: flex;
      flex-direction: column;
    }

    .form-card-header {
      padding: 1.5rem 2rem;
      background: var(--color-bg-panel);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: -1.5rem -1.5rem 0 -1.5rem; /* Break out of modal body padding */
    }

    .hero-top {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .hero-room {
      margin: 0.5rem 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .hero-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }

    .hero-detail {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .meta-sep {
      display: inline-flex;
      align-items: center;
      &::before {
        content: '|';
        margin: 0 10px;
        color: var(--color-border);
        opacity: 0.6;
      }
    }

    .booking-form {
      display: flex;
      flex-direction: column;
    }

    .form-body {
      padding: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-footer {
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      & > * {
        flex: 1;
      }
      @media (max-width: 640px) {
        flex-direction: column;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-weight: 600;
        font-size: var(--font-sm);
        color: var(--color-text-secondary);
      }
    }

    .z-10 { z-index: 10; position: relative; }
    .z-9 { z-index: 9; position: relative; }
    .z-8 { z-index: 8; position: relative; }
    .z-1 { z-index: 1; position: relative; }

    textarea {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radii-md);
      background: var(--color-bg-panel);
      color: var(--color-text-primary);
      font-family: inherit;
      font-size: 0.95rem;
      resize: vertical;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--focus-ring);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceBookingModalComponent {
  private modalService = inject(ModalService);
  private resourceService = inject(ResourceService);
  private toastService = inject(ToastService);

  private config = this.modalService.modalData();
  resource = this.config.resource;

  isSubmitting = signal(false);

  bookingForm = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('')
  });

  constructor() {
    const pad = (n: number) => String(n).padStart(2, '0');
    
    // Set defaults from prefill or today
    const start = this.config.prefillStart || new Date();
    const end = this.config.prefillEnd || (() => {
      const d = new Date(start);
      d.setHours(17, 0, 0, 0); // Default to 17:00 if no end date
      if (start.getHours() >= 17) {
        d.setHours(start.getHours() + 1); // Or 1 hour later if after 17:00
      }
      return d;
    })();

    this.bookingForm.patchValue({
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startTime: this.config.prefillStart ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '08:00',
      endTime: this.config.prefillStart ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '17:00'
    });
  }

  updateDate(date: string | null) {
    if (date) this.bookingForm.controls.date.setValue(date);
  }

  updateStartTime(time: string | null) {
    if (time) this.bookingForm.controls.startTime.setValue(time);
  }

  updateEndTime(time: string | null) {
    if (time) this.bookingForm.controls.endTime.setValue(time);
  }

  close() {
    this.modalService.close();
  }

  async submitBooking() {
    if (this.bookingForm.invalid) return;

    this.isSubmitting.set(true);
    const form = this.bookingForm.getRawValue();

    // Construct local dates to avoid timezone issues when converting to ISO
    const startStr = `${form.date}T${form.startTime}`;
    const endStr = `${form.date}T${form.endTime}`;

    const dto: CreateResourceBookingDto = {
      resourceId: this.resource.id,
      startTime: new Date(startStr).toISOString(),
      endTime: new Date(endStr).toISOString(),
      notes: form.notes || ''
    };

    try {
      await firstValueFrom(this.resourceService.createBooking(dto));
      this.toastService.showSuccess(`Bokning av ${this.resource.name} klar!`);
      if (this.config.onBookingCreated) {
        this.config.onBookingCreated();
      }
      this.close();
    } catch (err: any) {
      if (err.status === 409) {
        this.toastService.showError('Resursen är redan bokad under denna tid.');
      } else {
        this.toastService.showError('Kunde inte genomföra bokningen.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
