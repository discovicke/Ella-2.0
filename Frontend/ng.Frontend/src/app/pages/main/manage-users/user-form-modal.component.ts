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
import {
  BannedStatus,
  UserPermissions,
  PermissionTemplateDto,
  CampusResponseDto,
  ClassResponseDto,
} from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

export interface CustomPermissionsPayload {
  bookRoom: boolean;
  myBookings: boolean;
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageAssets: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
}

export interface UserFormPayload {
  id?: number;
  email: string;
  displayName: string;
  password?: string;
  isBanned?: BannedStatus;
  selectedTemplateId: number | null;
  customPermissions: CustomPermissionsPayload;
  campusIds: number[];
  classIds: number[];
}

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
          maxlength="100"
        />
        @if (userForm.get('displayName')?.invalid && userForm.get('displayName')?.touched) {
          <span class="error-msg">Namn krävs</span>
        }
      </div>

      <div class="form-group">
        <label for="email">E-post</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          placeholder="namn@example.com"
          maxlength="254"
        />
        @if (userForm.get('email')?.invalid && userForm.get('email')?.touched) {
          <span class="error-msg">Giltig e-post krävs</span>
        }
      </div>

      <div class="form-group">
        <label for="templateId">Roll</label>
        <select id="templateId" formControlName="templateId">
          <option [ngValue]="null">Anpassad (ingen mall)</option>
          @for (template of templateOptions; track template.id) {
            <option [ngValue]="template.id">{{ template.label }}</option>
          }
        </select>
      </div>

      @if (userForm.controls.templateId.value === null) {
        <div class="permissions-block">
          <p class="permissions-title">Anpassade behörigheter</p>
          <p class="permissions-hint">
            Välj exakt vad användaren ska kunna göra. Avmarkerat betyder ingen åtkomst.
          </p>
          <div class="permissions-grid">
            @for (permission of permissionOptions; track permission.key) {
              <label class="permission-item" [class.active]="isPermissionEnabled(permission.key)">
                <input type="checkbox" [formControlName]="permission.key" />
                <span class="permission-label">{{ permission.label }}</span>
                <span class="permission-switch" aria-hidden="true">
                  <span class="switch-thumb"></span>
                </span>
              </label>
            }
          </div>
        </div>
      }

      <div class="form-row">
        <div class="form-group">
          <label for="password">Lösenord</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Minst 6 tecken (krävs)"
            maxlength="128"
          />
          @if (initialData) {
            <span class="field-hint">Lämna tomt om du inte vill ändra lösenordet.</span>
          }
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
            maxlength="128"
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

      @if (campusOptions.length) {
        <div class="associations-section">
          <p class="associations-title">Campus</p>
          <p class="associations-hint">Välj vilka campus användaren tillhör.</p>
          <div class="pill-grid">
            @for (campus of campusOptions; track campus.id) {
              <button
                type="button"
                class="pill"
                [class.on]="isCampusSelected(campus.id)"
                (click)="toggleCampus(campus.id)"
              >
                @if (isCampusSelected(campus.id)) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
                {{ campus.city }}
              </button>
            }
          </div>
        </div>
      }

      @if (classOptions.length) {
        <div class="associations-section">
          <p class="associations-title">Klasser</p>
          <p class="associations-hint">Välj vilka klasser användaren tillhör.</p>
          <div class="pill-grid">
            @for (cls of classOptions; track cls.id) {
              <button
                type="button"
                class="pill"
                [class.on]="isClassSelected(cls.id)"
                (click)="toggleClass(cls.id)"
              >
                @if (isClassSelected(cls.id)) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
                {{ cls.className }}
              </button>
            }
          </div>
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

      .field-hint {
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
        margin-top: -0.25rem;
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

      .permissions-block {
        @include stack(0.5rem);
        padding: 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background: var(--color-bg-panel);
      }

      .permissions-title {
        margin: 0;
        font-size: var(--font-sm);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .permissions-hint {
        margin: 0;
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
      }

      .permissions-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;

        @media (max-width: 640px) {
          grid-template-columns: 1fr;
        }
      }

      .permission-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.55rem 0.65rem;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background: var(--color-bg-card);
        cursor: pointer;
        transition: all var(--transition-fast) var(--ease-smooth);
        font-size: var(--font-sm);
        color: var(--color-text-primary);

        &:hover {
          border-color: var(--color-primary);
          background: var(--color-primary-surface);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--color-primary-surface);
        }

        input[type='checkbox'] {
          display: none;
        }
      }

      .permission-label {
        line-height: 1.25;
      }

      .permission-switch {
        position: relative;
        width: 2.15rem;
        height: 1.2rem;
        border-radius: 999px;
        background: var(--color-divider);
        transition: background var(--transition-fast) var(--ease-smooth);
        flex-shrink: 0;
      }

      .switch-thumb {
        position: absolute;
        top: 0.13rem;
        left: 0.13rem;
        width: 0.94rem;
        height: 0.94rem;
        border-radius: 50%;
        background: var(--color-bg-card);
        box-shadow: var(--shadow-sm);
        transition: transform var(--transition-fast) var(--ease-smooth);
      }

      .permission-item.active .permission-switch {
        background: var(--color-primary);
      }

      .permission-item.active .switch-thumb {
        transform: translateX(0.95rem);
      }

      .associations-section {
        @include stack(0.5rem);
        padding: 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background: var(--color-bg-panel);
      }

      .associations-title {
        margin: 0;
        font-size: var(--font-sm);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .associations-hint {
        margin: 0;
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
      }

      .pill-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 999px;
        background: var(--color-bg-card);
        color: var(--color-text-secondary);
        font-size: var(--font-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;

        svg {
          width: 0.9rem;
          height: 0.9rem;
          stroke: currentColor;
          flex-shrink: 0;
        }

        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        &.on {
          background: var(--color-primary-surface);
          border-color: var(--color-primary);
          color: var(--color-primary);
          font-weight: 600;
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
  protected templateOptions: PermissionTemplateDto[] = this.config?.templateOptions ?? [];
  protected initialTemplateId: number | null = this.config?.initialTemplateId ?? null;
  protected initialPermissions: UserPermissions | undefined = this.config?.initialPermissions;
  protected campusOptions: CampusResponseDto[] = this.config?.campusOptions ?? [];
  protected classOptions: ClassResponseDto[] = this.config?.classOptions ?? [];

  private selectedCampusIds = signal<number[]>(this.config?.initialCampusIds ?? []);
  private selectedClassIds = signal<number[]>(this.config?.initialClassIds ?? []);

  protected readonly permissionOptions: Array<{
    key: keyof CustomPermissionsPayload;
    label: string;
  }> = [
    { key: 'bookRoom', label: 'Boka rum' },
    { key: 'myBookings', label: 'Mina bokningar' },
    { key: 'manageUsers', label: 'Hantera användare' },
    { key: 'manageClasses', label: 'Hantera klasser' },
    { key: 'manageRooms', label: 'Hantera rum' },
    { key: 'manageAssets', label: 'Hantera tillgångar' },
    { key: 'manageBookings', label: 'Hantera bokningar' },
    { key: 'manageCampuses', label: 'Hantera campus' },
    { key: 'manageRoles', label: 'Hantera roller' },
  ];

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
      templateId: new FormControl<number | null>(this.initialTemplateId),
      bookRoom: new FormControl<boolean>(this.initialPermissions?.bookRoom ?? true, {
        nonNullable: true,
      }),
      myBookings: new FormControl<boolean>(this.initialPermissions?.myBookings ?? true, {
        nonNullable: true,
      }),
      manageUsers: new FormControl<boolean>(this.initialPermissions?.manageUsers ?? false, {
        nonNullable: true,
      }),
      manageClasses: new FormControl<boolean>(this.initialPermissions?.manageClasses ?? false, {
        nonNullable: true,
      }),
      manageRooms: new FormControl<boolean>(this.initialPermissions?.manageRooms ?? false, {
        nonNullable: true,
      }),
      manageAssets: new FormControl<boolean>(this.initialPermissions?.manageAssets ?? false, {
        nonNullable: true,
      }),
      manageBookings: new FormControl<boolean>(this.initialPermissions?.manageBookings ?? false, {
        nonNullable: true,
      }),
      manageCampuses: new FormControl<boolean>(this.initialPermissions?.manageCampuses ?? false, {
        nonNullable: true,
      }),
      manageRoles: new FormControl<boolean>(this.initialPermissions?.manageRoles ?? false, {
        nonNullable: true,
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: this.initialData
          ? [Validators.minLength(6)]
          : [Validators.required, Validators.minLength(6)],
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

  isPermissionEnabled(key: keyof CustomPermissionsPayload): boolean {
    return !!this.userForm.controls[key].value;
  }

  isCampusSelected(id: number): boolean {
    return this.selectedCampusIds().includes(id);
  }

  toggleCampus(id: number): void {
    const current = this.selectedCampusIds();
    if (current.includes(id)) {
      this.selectedCampusIds.set(current.filter((c) => c !== id));
    } else {
      this.selectedCampusIds.set([...current, id]);
    }
  }

  isClassSelected(id: number): boolean {
    return this.selectedClassIds().includes(id);
  }

  toggleClass(id: number): void {
    const current = this.selectedClassIds();
    if (current.includes(id)) {
      this.selectedClassIds.set(current.filter((c) => c !== id));
    } else {
      this.selectedClassIds.set([...current, id]);
    }
  }

  async onSubmit() {
    if (this.userForm.invalid) return;

    const {
      confirmPassword,
      templateId,
      bookRoom,
      myBookings,
      manageUsers,
      manageClasses,
      manageRooms,
      manageAssets,
      manageBookings,
      manageCampuses,
      manageRoles,
      ...formData
    } = this.userForm.getRawValue();

    const payload: UserFormPayload = {
      ...this.initialData,
      ...formData,
      selectedTemplateId: templateId ?? null,
      customPermissions: {
        bookRoom,
        myBookings,
        manageUsers,
        manageClasses,
        manageRooms,
        manageAssets,
        manageBookings,
        manageCampuses,
        manageRoles,
      },
      campusIds: this.selectedCampusIds(),
      classIds: this.selectedClassIds(),
    };

    // Om vi redigerar och lösenordet är tomt -> Ta bort det helt från payloaden
    // så att backend inte försöker validera en tom sträng.
    if (this.initialData && !formData.password) {
      delete (payload as any).password;
    }

    if (this.config?.onSave) {
      this.isSubmitting.set(true);
      try {
        await this.config.onSave(payload);
        // Note: Success usually closes the modal, which destroys this component.
      } catch (error) {
        this.isSubmitting.set(false);
      }
    }
  }

  async onDelete() {
    if (!this.config?.onDelete || !this.initialData?.id) return;

    const confirmed = await this.confirmService.danger(
      'Användaren kommer att raderas permanent och kan inte återställas.',
      'Radera användare',
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onDelete(this.initialData.id);
    } catch (error) {
      this.isSubmitting.set(false);
    }
  }

  onCancel() {
    this.modalService.close();
  }
}
