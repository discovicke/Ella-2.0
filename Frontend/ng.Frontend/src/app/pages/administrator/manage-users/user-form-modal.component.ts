import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../../../shared/services/user.service';
import {BannedStatus} from '../../../models/models';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form">
      <div class="form-group">
        <label for="name">Namn</label>
        <input id="name" type="text" formControlName="name" placeholder="Förnamn Efternamn" />
        @if (userForm.get('name')?.invalid && userForm.get('name')?.touched) {
          <span class="error-msg">Namn krävs</span>
        }
      </div>

      <div class="form-group">
        <label for="password">Lösenord</label>
        <input id="password" type="text" formControlName="password" placeholder="Lösenord minst 6 tecken" />

        @if (userForm.get('password')?.errors?.['minlength'] && userForm.get('password')?.touched) {
          <span class="error-msg">Lösenord måste vara minst 6 tecken långt</span>
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
        <label for="role">Roll</label>
        <select id="role" formControlName="role">
          <option value="">-- Välj roll --</option>
          <option value="student">Student</option>
          <option value="teacher">Lärare</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" (click)="onCancel()">Avbryt</button>
        <button type="submit" class="btn-primary" [disabled]="userForm.invalid || isSubmitting()">
          {{ isSubmitting() ? 'Sparar...' : 'Spara ändringar' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    @use 'styles/mixins' as *;

    // .user-form {
    //   @include stack(0rem);
    // }

    .form-group {
      @include stack(0.5rem);

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
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormModalComponent {
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  // Hämta data som skickades med modalService.open(comp, { data: ... })
  private initialData = this.modalService.modalData();

  readonly isSubmitting = signal(false);

  readonly userForm = new FormGroup({
    name: new FormControl(this.initialData?.name || '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    email: new FormControl(this.initialData?.email || '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    role: new FormControl(this.initialData?.role || '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    password: new FormControl(this.initialData?.password || '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
      }
    ),
  });



  // Signals för att spegla värden (SignalForms approach)
  readonly nameValue = toSignal(this.userForm.controls.name.valueChanges, { initialValue: '' });

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting.set(true);

    const userData = this.userForm.getRawValue();
    const userId = this.initialData?.id;

    const payload = {
      id: userId,
      displayName: userData.name,
      email: userData.email,
      role: userData.role,
      password: userData.password,
      userClass: 'net25',
      isBanned: BannedStatus.NotBanned
    };

    inject (UserService).updateUser(userId, payload).subscribe({
      next: () => {
        this.toastService.showSuccess('Användaren har sparats!');
        this.isSubmitting.set(false);
        this.modalService.close();
      }});

    // Simulera API-anrop
    setTimeout(() => {
      console.log('Sparar data:', this.userForm.getRawValue());
      this.toastService.showSuccess('Användaren har sparats!');
      this.isSubmitting.set(false);
      this.modalService.close();
    }, 1000);
  }

  onCancel() {
    this.modalService.close();
  }
}
