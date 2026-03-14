import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
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
import { SelectablePillComponent } from '../../../shared/components/selectable-pill/selectable-pill.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';

export interface CustomPermissionsPayload {
  bookRoom: boolean;
  bookResource: boolean;
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
  manageResources: boolean;
}

export interface UserFormPayload {
  id?: number;
  email: string;
  displayName: string;
  password?: string;
  isBanned?: BannedStatus;
  permissionLevelOverride: number | null;
  selectedTemplateId: number | null;
  customPermissions: CustomPermissionsPayload;
  campusIds: number[];
  classIds: number[];
}

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;
  if (confirmPassword.disabled) return null;

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-user-form-modal',
  imports: [ReactiveFormsModule, ButtonComponent, SelectablePillComponent, SelectComponent],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div class="modal-content-body">
        <!-- Section: Account Information -->
        <div class="form-section">
          <p class="form-section-title">Kontoinformation</p>
          
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

          <div class="form-row">
            <div class="form-group">
              <label for="password">Lösenord</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="Minst 6 tecken"
                maxlength="128"
              />
              @if (initialData) {
                <span class="field-hint">Lämna tomt för att behålla befintligt.</span>
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
              <label>Status</label>
              <app-select
                [options]="statusOptions"
                [value]="userForm.controls.isBanned.value"
                (valueChange)="userForm.controls.isBanned.setValue($any($event))"
              ></app-select>
            </div>
          }
        </div>

        <!-- Section: Permissions -->
        <div class="form-section">
          <p class="form-section-title">Behörighet & Prioritet</p>
          
          <div class="form-row">
            <div class="form-group flex-2">
              <label>Roll</label>
              <app-select
                [options]="roleSelectOptions()"
                [value]="userForm.controls.templateId.value ?? 'null'"
                (valueChange)="onRoleSelectChange($event)"
              ></app-select>
            </div>

            <div class="form-group flex-1">
              <label>Prioritetsnivå</label>
              <app-select
                [options]="permissionLevelOptions()"
                [value]="userForm.controls.permissionLevelOverride.value ?? 'null'"
                (valueChange)="onPermissionLevelChange($event)"
              ></app-select>
              <span class="field-hint">Vid bokningskrockar vinner högre nivå.</span>
            </div>
          </div>

          @if (userForm.controls.templateId.value === null) {
            <div class="form-section-inner">
              <p class="form-section-subtitle">Anpassade behörigheter</p>
              <p class="form-section-hint">
                Välj exakt vad användaren ska kunna göra.
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
        </div>

        <!-- Section: Affiliation -->
        @if (campusOptions.length || classOptions.length) {
          <div class="form-section">
            <p class="form-section-title">Tillhörighet</p>

            @if (campusOptions.length) {
              <div class="affiliation-group">
                <p class="form-section-subtitle">Campus</p>
                <div class="pill-grid">
                  @for (campus of campusOptions; track campus.id) {
                    <app-selectable-pill
                      [selected]="isCampusSelected(campus.id)"
                      (toggle)="toggleCampus(campus.id)"
                    >
                      {{ campus.city }}
                    </app-selectable-pill>
                  }
                </div>
              </div>
            }

            @if (classOptions.length) {
              <div class="affiliation-group">
                <p class="form-section-subtitle">Klasser</p>
                <div class="pill-grid">
                  @for (cls of classOptions; track cls.id) {
                    <app-selectable-pill
                      [selected]="isClassSelected(cls.id)"
                      (toggle)="toggleClass(cls.id)"
                    >
                      {{ cls.className }}
                    </app-selectable-pill>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="modal-footer">
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

      .flex-1 { flex: 1; }
      .flex-2 { flex: 2; }
      .flex-3 { flex: 3; }

      .form-section {
        @include stack(1.25rem);

        &:not(:last-child) {
          margin-bottom: 2rem;
        }
      }

      .form-section-title {
        font-size: var(--font-sm);
        font-weight: 700;
        color: var(--color-primary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }

      .form-section-inner {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--color-bg-panel);
        border-radius: 0.75rem;
        border: 1px solid var(--color-border);
      }

      .form-section-subtitle {
        font-size: var(--font-sm);
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 0.25rem;
      }

      .affiliation-group {
        @include stack(0.5rem);
        &:not(:last-child) {
          margin-bottom: 1rem;
        }
      }

      .form-group {
        @include stack(0.4rem);
        margin-bottom: 0;

        label {
          font-weight: 600;
          font-size: var(--font-sm);
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

      .permissions-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
        margin-top: 0.5rem;

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

      .pill-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .modal-footer {
        border-top: none;
        margin-top: 1rem;
        padding-top: 0.5rem;
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
  protected initialTemplateId: number | null = this.config?.initialTemplateId ?? null;
  protected initialPermissions: UserPermissions | undefined = this.config?.initialPermissions;
  protected campusOptions: CampusResponseDto[] = this.config?.campusOptions ?? [];
  protected classOptions: ClassResponseDto[] = this.config?.classOptions ?? [];

  protected readonly roleSelectOptions = signal<SelectOption[]>([
    { id: 'null', label: 'Anpassad (ingen mall)' },
    ...(this.config?.templateOptions ?? []).map((t: PermissionTemplateDto) => ({
      id: t.id,
      label: t.label,
    })),
  ]);

  protected readonly statusOptions: SelectOption[] = [
    { id: BannedStatus.NotBanned, label: 'Aktiv' },
    { id: BannedStatus.Banned, label: 'Bannlyst' },
  ];

  private selectedCampusIds = signal<number[]>(this.config?.initialCampusIds ?? []);
  private selectedClassIds = signal<number[]>(this.config?.initialClassIds ?? []);

  // Compute options based on selected template
  protected readonly selectedTemplate = signal<PermissionTemplateDto | null>(
    (this.config?.templateOptions ?? []).find((t: PermissionTemplateDto) => t.id === this.initialTemplateId) ?? null
  );

  protected readonly permissionLevelOptions = computed(() => {
    const tpl = this.selectedTemplate();
    const defaultOpt: SelectOption = {
      id: 'null',
      label: tpl ? `Ärv från ${tpl.label} (Nivå ${tpl.defaultPermissionLevel ?? 1})` : 'Standard (Nivå 1)'
    };
    
    const explicitOptions: SelectOption[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      label: `Anpassad: ${i + 1}${i === 0 ? ' (Lägst)' : i === 9 ? ' (Högst)' : ''}`
    }));

    return [defaultOpt, ...explicitOptions];
  });

  protected readonly permissionOptions: Array<{
    key: keyof CustomPermissionsPayload;
    label: string;
  }> = [
    { key: 'bookRoom', label: 'Boka rum' },
    { key: 'bookResource', label: 'Boka resurs' },
    { key: 'manageUsers', label: 'Hantera användare' },
    { key: 'manageClasses', label: 'Hantera klasser' },
    { key: 'manageRooms', label: 'Hantera rum' },
    { key: 'manageBookings', label: 'Hantera bokningar' },
    { key: 'manageCampuses', label: 'Hantera campus' },
    { key: 'manageRoles', label: 'Hantera roller' },
    { key: 'manageResources', label: 'Hantera resurser' },
  ];

  readonly isSubmitting = signal(false);

  readonly userForm = new FormGroup(
    {
      displayName: new FormControl(this.initialData?.displayName || '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      permissionLevelOverride: new FormControl<number | null>(this.initialData?.permissionLevelOverride ?? null, {
        nonNullable: false,
      }),
      email: new FormControl(this.initialData?.email || '', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      templateId: new FormControl<number | null>(this.initialTemplateId),
      bookRoom: new FormControl<boolean>(this.initialPermissions?.bookRoom ?? true, {
        nonNullable: true,
      }),
      bookResource: new FormControl<boolean>(this.initialPermissions?.bookResource ?? true, {
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
      manageBookings: new FormControl<boolean>(this.initialPermissions?.manageBookings ?? false, {
        nonNullable: true,
      }),
      manageCampuses: new FormControl<boolean>(this.initialPermissions?.manageCampuses ?? false, {
        nonNullable: true,
      }),
      manageRoles: new FormControl<boolean>(this.initialPermissions?.manageRoles ?? false, {
        nonNullable: true,
      }),
      manageResources: new FormControl<boolean>(this.initialPermissions?.manageResources ?? false, {
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
    this.userForm.controls.password.valueChanges.subscribe((pwd) => {
      if (pwd && pwd.length > 0) {
        this.userForm.controls.confirmPassword.enable();
      } else {
        this.userForm.controls.confirmPassword.disable();
        this.userForm.controls.confirmPassword.setValue('');
      }
    });
  }

  onRoleSelectChange(id: string | number | null) {
    const value = id === 'null' ? null : Number(id);
    const oldTpl = this.selectedTemplate();
    const newTpl = (this.config?.templateOptions ?? []).find((t: PermissionTemplateDto) => t.id === value) ?? null;
    
    // Check if user has custom override and template changed
    if (this.userForm.controls.permissionLevelOverride.value !== null && oldTpl?.id !== newTpl?.id) {
      this.confirmService.show(
        `Användaren har en anpassad prioritetsnivå (${this.userForm.controls.permissionLevelOverride.value}). Vill du återställa till standardnivån för den nya rollen?`,
        {
          title: 'Behåll anpassad nivå?',
          confirmText: 'Återställ till standard',
          cancelText: 'Behåll anpassad',
          dangerConfirm: false,
        }
      ).then((restore: boolean) => {
        if (restore) {
          this.userForm.controls.permissionLevelOverride.setValue(null);
        }
      });
    }

    this.userForm.controls.templateId.setValue(value);
    this.selectedTemplate.set(newTpl);
  }

  onPermissionLevelChange(id: string | number | null) {
    const value = id === 'null' ? null : Number(id);
    this.userForm.controls.permissionLevelOverride.setValue(value);
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
      bookResource,
      manageUsers,
      manageClasses,
      manageRooms,
      manageBookings,
      manageCampuses,
      manageRoles,
      manageResources,
      ...formData
    } = this.userForm.getRawValue();

    const payload: UserFormPayload = {
      ...this.initialData,
      ...formData,
      selectedTemplateId: templateId ?? null,
      customPermissions: {
        bookRoom,
        bookResource,
        manageUsers,
        manageClasses,
        manageRooms,
        manageBookings,
        manageCampuses,
        manageRoles,
        manageResources,
      },
      campusIds: this.selectedCampusIds(),
      classIds: this.selectedClassIds(),
    };

    if (this.initialData && !formData.password) {
      delete (payload as any).password;
    }

    if (this.config?.onSave) {
      this.isSubmitting.set(true);
      try {
        await this.config.onSave(payload);
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
