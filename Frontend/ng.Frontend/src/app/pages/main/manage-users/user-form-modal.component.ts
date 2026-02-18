import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { BannedStatus } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

/**
 * Validator som ser till att lösenorden matchar
 */
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;
  if (confirmPassword.disabled) return null; // Ignorera om fältet är disabled

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form">
      <div class="form-group">
        <label for="displayName">Namn</label>
        <input
          id="displayName"
          type="text"
          formControlName="displayName"
          placeholder="Förnamn Efternamn"
        />
        @if (userForm.get('displayName')?.invalid && userForm.get('displayName')?.touched) {
          <span class="error-msg">Namn krävs</span>
        }
      </div>

      <div class="form-group">
        <label for="email">E-post</label>
        <input id="email" type="email" formControlName="email" placeholder="namn@example.com" />
        @if (userForm.get('email')?.invalid && userForm.get('email')?.touched) {
          <span class="error-msg">Giltig e-post krävs</span>
        }
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="password">Lösenord</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Minst 6 tecken (krävs)"
          />
          @if (userForm.get('password')?.invalid && userForm.get('password')?.touched) {
            <span class="error-msg">Lösenord krävs (minst 6 tecken)</span>
          }
        </div>

        <div class="form-group">
          <label for="confirmPassword">Bekräfta lösenord</label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            placeholder="Upprepa lösenordet"
          />
          @if (userForm.errors?.['passwordMismatch'] && userForm.get('confirmPassword')?.touched) {
            <span class="error-msg">Lösenorden matchar inte</span>
          }
        </div>
      </div>

      @if (initialData) {
        <div class="form-group">
          <label for="isBanned">Status</label>
          <select id="isBanned" formControlName="isBanned">
            <option [value]="BannedStatus.NotBanned">Aktiv</option>
            <option [value]="BannedStatus.Banned">Bannlyst</option>
          </select>
        </div>
      }

      <div class="form-actions">
        <app-button variant="tertiary" (clicked)="onCancel()">Avbryt</app-button>
        @if (initialData) {
          <app-button variant="danger" (clicked)="onDelete()" [disabled]="isSubmitting()">
            Radera
          </app-button>
        }
        <app-button type="submit" variant="primary" [disabled]="userForm.invalid || isSubmitting()">
          {{ isSubmitting() ? 'Sparar...' : 'Spara' }}
        </app-button>
      </div>
    </form>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .user-form {
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
      }

      .form-group {
        @include stack(0.5rem);
        margin-bottom: 0;

        label {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        input,
        select {
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
        margin-top: 1rem;

        .btn-primary {
          @include button-primary;
        }
        .btn-secondary {
          @include button-ghost;
        }
        .btn-danger {
          @include button-danger;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);
  protected readonly BannedStatus = BannedStatus;

  private config = this.modalService.modalData();
  protected initialData = this.config?.user;

  readonly isSubmitting = signal(false);

  readonly userForm = new FormGroup(
    {
      displayName: new FormControl(this.initialData?.displayName || '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      email: new FormControl(this.initialData?.email || '', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl(
        { value: '', disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      isBanned: new FormControl<BannedStatus>(
        this.initialData?.isBanned || BannedStatus.NotBanned,
        {
          nonNullable: true,
        },
      ),
    },
    { validators: [passwordMatchValidator] },
  );

  constructor() {
    // Hantera confirmPassword baserat på om password har ett värde
    this.userForm.controls.password.valueChanges.subscribe((pwd) => {
      if (pwd && pwd.length > 0) {
        this.userForm.controls.confirmPassword.enable();
      } else {
        this.userForm.controls.confirmPassword.disable();
        this.userForm.controls.confirmPassword.setValue('');
      }
    });
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    const { confirmPassword, ...formData } = this.userForm.getRawValue();

    const payload = {
      ...this.initialData,
      ...formData,
    };

    // Om vi redigerar och lösenordet är tomt -> Ta bort det helt från payloaden
    // så att backend inte försöker validera en tom sträng.
    if (this.initialData && !formData.password) {
      delete (payload as any).password;
    }

    if (this.config?.onSave) {
      this.isSubmitting.set(true);
      this.config.onSave(payload);
    }
  }

  async onDelete() {
    if (!this.config?.onDelete || !this.initialData?.id) return;

    const confirmed = await this.confirmService.danger(
      'Anv\u00e4ndaren kommer att raderas permanent och kan inte \u00e5terst\u00e4llas.',
      'Radera anv\u00e4ndare',
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    this.config.onDelete(this.initialData.id);
  }

  onCancel() {
    this.modalService.close();
  }
}
