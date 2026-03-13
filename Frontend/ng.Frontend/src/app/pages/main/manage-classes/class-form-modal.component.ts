import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClassResponseDto, CampusResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { SelectablePillComponent } from '../../../shared/components/selectable-pill/selectable-pill.component';

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
  imports: [ReactiveFormsModule, ButtonComponent, SelectablePillComponent],
  template: `
    <form [formGroup]="classForm" (ngSubmit)="onSubmit()">
      <div class="modal-content-body">
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
          <div class="form-section">
            <p class="form-section-title">Campus</p>
            <p class="form-section-hint">Välj vilka campus klassen tillhör.</p>
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
      </div>

      <div class="modal-footer">
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

      .pill-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
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
      validators: [Validators.required],
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
