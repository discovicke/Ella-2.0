import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { UserRole, BannedStatus } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form">
      <div class="form-group">
        <label for="displayName">Namn</label>
        <input id="displayName" type="text" formControlName="displayName" placeholder="Förnamn Efternamn" />
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

      <div class="form-group">
        <label for="password">Lösenord</label>
        <input id="password" type="password" formControlName="password" placeholder="{{ initialData ? 'Lämna tomt för att behålla' : 'Minst 6 tecken' }}" />
        @if (!initialData && userForm.get('password')?.invalid && userForm.get('password')?.touched) {
          <span class="error-msg">Lösenord krävs (minst 6 tecken)</span>
        }
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="role">Roll</label>
          <select id="role" formControlName="role">
            <option value="">-- Välj roll --</option>
            <option [value]="UserRole.Student">Student</option>
            <option [value]="UserRole.Educator">Lärare</option>
            <option [value]="UserRole.Admin">Admin</option>
          </select>
        </div>

        <div class="form-group">
          <label for="userClass">Kurs / Klass</label>
          <input id="userClass" type="text" formControlName="userClass" placeholder="t.ex. NET25" />
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
  styles: [`
    @use 'styles/mixins' as *;

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      & > * { flex: 1; }
    }

    .form-group {
      @include stack(0.5rem);
      margin-bottom: 0;

      label {
        font-weight: 600;
        color: var(--color-text-primary);
      }

      input, select {
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

      .btn-primary { @include button-primary; }
      .btn-secondary { @include button-ghost; }
      .btn-danger { @include button-danger; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormModalComponent {
  private modalService = inject(ModalService);
  protected readonly UserRole = UserRole;
  protected readonly BannedStatus = BannedStatus;

  private config = this.modalService.modalData();
  protected initialData = this.config?.user;

  readonly isSubmitting = signal(false);

  readonly userForm = new FormGroup({
    displayName: new FormControl(this.initialData?.displayName || '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    email: new FormControl(this.initialData?.email || '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    role: new FormControl<UserRole>(this.initialData?.role || ('' as any), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    userClass: new FormControl(this.initialData?.userClass || '', {
      nonNullable: true
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: this.initialData ? [] : [Validators.required, Validators.minLength(6)]
    }),
    isBanned: new FormControl<BannedStatus>(this.initialData?.isBanned || BannedStatus.NotBanned, {
      nonNullable: true
    }),
  });

  constructor() {
    // Reaktivt hantera userClass baserat på roll
    this.userForm.controls.role.valueChanges.subscribe(role => {
      if (role === UserRole.Admin) {
        this.userForm.controls.userClass.disable();
        this.userForm.controls.userClass.setValue('');
      } else {
        this.userForm.controls.userClass.enable();
      }
    });

    // Kör en initial koll
    if (this.userForm.controls.role.value === UserRole.Admin) {
      this.userForm.controls.userClass.disable();
    }
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    const rawValue = this.userForm.getRawValue();

    const payload = {
      ...this.initialData,
      ...rawValue,
      // Se till att password inte skickas med om det är tomt vid edit
      ...(this.initialData && !rawValue.password ? { password: this.initialData.password } : {})
    };

    if (this.config?.onSave) {
      this.isSubmitting.set(true);
      this.config.onSave(payload);
    }
  }

  onDelete() {
    if (this.config?.onDelete && this.initialData?.id) {
      this.isSubmitting.set(true);
      this.config.onDelete(this.initialData.id);
    }
  }

  onCancel() {
    this.modalService.close();
  }
}
