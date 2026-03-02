import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { INPUT_LIMITS } from '../../../shared/constants/input-limits';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { CampusResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

export interface CampusFormPayload {
  street: string;
  zip: string | null;
  city: string;
  country: string;
  contact: string | null;
}

export interface CampusFormModalConfig {
  campus: CampusResponseDto | null;
  onSave: (payload: CampusFormPayload) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

@Component({
  selector: 'app-campus-form-modal',
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="campusForm" (ngSubmit)="onSubmit()" class="campus-form">
      <div class="form-group">
        <label for="campus-city">Stad</label>
        <input
          id="campus-city"
          type="text"
          formControlName="city"
          placeholder="t.ex. Gävle"
          maxlength="100"
        />
        @if (campusForm.get('city')?.invalid && campusForm.get('city')?.touched) {
          <span class="error-msg">Stad krävs</span>
        }
      </div>

      <div class="form-group">
        <label for="campus-street">Adress</label>
        <input
          id="campus-street"
          type="text"
          formControlName="street"
          placeholder="t.ex. Kungsgatan 12"
          maxlength="150"
        />
        @if (campusForm.get('street')?.invalid && campusForm.get('street')?.touched) {
          <span class="error-msg">Adress krävs</span>
        }
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="campus-zip">Postnummer</label>
          <input
            id="campus-zip"
            type="text"
            formControlName="zip"
            placeholder="t.ex. 802 10"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label for="campus-country">Land</label>
          <input
            id="campus-country"
            type="text"
            formControlName="country"
            placeholder="t.ex. Sverige"
            maxlength="100"
          />
          @if (campusForm.get('country')?.invalid && campusForm.get('country')?.touched) {
            <span class="error-msg">Land krävs</span>
          }
        </div>
      </div>

      <div class="form-group">
        <label for="campus-contact">Kontakt</label>
        <input
          id="campus-contact"
          type="text"
          formControlName="contact"
          placeholder="Valfri kontaktinfo..."
          maxlength="150"
        />
      </div>

      <div class="form-actions">
        <app-button variant="tertiary" (clicked)="onCancel()">Avbryt</app-button>
        @if (initialData) {
          <app-button variant="danger" (clicked)="onDelete()" [disabled]="isSubmitting()">
            Ta bort
          </app-button>
        }
        <app-button
          type="submit"
          variant="primary"
          [disabled]="campusForm.invalid || isSubmitting()"
        >
          {{ isSubmitting() ? 'Sparar...' : initialData ? 'Spara ändringar' : 'Skapa campus' }}
        </app-button>
      </div>
    </form>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .campus-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-row {
        display: flex;
        gap: 1rem;
        & > * {
          flex: 1;
        }

        @media (max-width: 480px) {
          flex-direction: column;
        }
      }

      .form-group {
        @include stack(0.5rem);
        margin-bottom: 0;

        label {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        input {
          @include input-base;
        }
      }

      .error-msg {
        font-size: var(--font-sm);
        color: var(--color-danger);
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusFormModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);

  private config: CampusFormModalConfig = this.modalService.modalData();
  protected initialData = this.config?.campus;

  readonly isSubmitting = signal(false);

  readonly campusForm = new FormGroup({
    city: new FormControl(this.initialData?.city ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(INPUT_LIMITS.CreateCampusDto.city)],
    }),
    street: new FormControl(this.initialData?.street ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(INPUT_LIMITS.CreateCampusDto.street)],
    }),
    zip: new FormControl<string | null>(this.initialData?.zip ?? null, {
      validators: [Validators.maxLength(INPUT_LIMITS.CreateCampusDto.zip)],
    }),
    country: new FormControl(this.initialData?.country ?? 'Sverige', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(INPUT_LIMITS.CreateCampusDto.country)],
    }),
    contact: new FormControl<string | null>(this.initialData?.contact ?? null, {
      validators: [Validators.maxLength(INPUT_LIMITS.CreateCampusDto.contact)],
    }),
  });

  async onSubmit(): Promise<void> {
    if (this.campusForm.invalid) return;

    const value = this.campusForm.getRawValue();

    const payload: CampusFormPayload = {
      city: value.city.trim(),
      street: value.street.trim(),
      zip: value.zip?.trim() || null,
      country: value.country.trim(),
      contact: value.contact?.trim() || null,
    };

    if (this.config?.onSave) {
      this.isSubmitting.set(true);
      try {
        await this.config.onSave(payload);
      } catch {
        this.isSubmitting.set(false);
      }
    }
  }

  async onDelete(): Promise<void> {
    if (!this.config?.onDelete || !this.initialData?.id) return;

    const confirmed = await this.confirmService.danger(
      `Campuset "${this.initialData.city}" kommer att tas bort permanent.`,
      'Ta bort campus',
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onDelete(this.initialData.id);
    } catch {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.modalService.close();
  }
}
