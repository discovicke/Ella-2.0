import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClassResponseDto, CampusResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

export interface ClassFormPayload {
  className: string;
  campusIds: number[];
}

export interface ClassFormModalConfig {
  schoolClass: ClassResponseDto | null;
  campusOptions: CampusResponseDto[];
  initialCampusIds: number[];
  onSave: (payload: ClassFormPayload) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

@Component({
  selector: 'app-class-form-modal',
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="classForm" (ngSubmit)="onSubmit()" class="class-form">
      <div class="form-group">
        <label for="class-name">Klassnamn</label>
        <input
          id="class-name"
          type="text"
          formControlName="className"
          placeholder="t.ex. net25"
          maxlength="100"
        />
        @if (classForm.get('className')?.invalid && classForm.get('className')?.touched) {
          <span class="error-msg">Klassnamn krävs</span>
        }
      </div>

      @if (campusOptions.length) {
        <div class="associations-section">
          <p class="associations-title">Campus</p>
          <p class="associations-hint">Välj vilka campus klassen tillhör.</p>
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
          [disabled]="classForm.invalid || isSubmitting()"
        >
          {{ isSubmitting() ? 'Sparar...' : initialData ? 'Spara ändringar' : 'Skapa klass' }}
        </app-button>
      </div>
    </form>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .class-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
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

      .associations-section {
        @include stack(0.5rem);
        padding-top: 0.25rem;
      }

      .associations-title {
        margin: 0;
        font-weight: 600;
        font-size: var(--font-sm);
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
export class ClassFormModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);

  private config: ClassFormModalConfig = this.modalService.modalData();
  protected initialData = this.config?.schoolClass;
  protected campusOptions: CampusResponseDto[] = this.config?.campusOptions ?? [];

  readonly isSubmitting = signal(false);
  readonly selectedCampusIds = signal<Set<number>>(new Set(this.config?.initialCampusIds ?? []));

  readonly classForm = new FormGroup({
    className: new FormControl(this.initialData?.className ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
      ],
    }),
  });

  isCampusSelected(id: number): boolean {
    return this.selectedCampusIds().has(id);
  }

  toggleCampus(id: number): void {
    this.selectedCampusIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async onSubmit(): Promise<void> {
    if (this.classForm.invalid) return;

    const value = this.classForm.getRawValue();

    const payload: ClassFormPayload = {
      className: value.className.trim(),
      campusIds: [...this.selectedCampusIds()],
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
      `Klassen "${this.initialData.className}" kommer att tas bort permanent.`,
      'Ta bort klass',
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
