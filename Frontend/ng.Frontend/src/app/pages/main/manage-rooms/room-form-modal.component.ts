import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { AssetTypeResponseDto, RoomDetailModel, RoomTypeResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { SelectablePillComponent } from '../../../shared/components/selectable-pill/selectable-pill.component';

export interface RoomFormPayload {
  name: string;
  campusId: number;
  roomTypeId: number;
  capacity: number | null;
  floor: string | null;
  notes: string | null;
  assetIds: number[];
}

export interface RoomFormModalConfig {
  room: RoomDetailModel | null;
  campusOptions: { id: number; city: string }[];
  roomTypes: RoomTypeResponseDto[];
  assetTypes: AssetTypeResponseDto[];
  initialAssetIds: number[];
  onSave: (payload: RoomFormPayload) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

@Component({
  selector: 'app-room-form-modal',
  imports: [ReactiveFormsModule, ButtonComponent, SelectablePillComponent],
  template: `
    <form [formGroup]="roomForm" (ngSubmit)="onSubmit()">
      <div class="modal-content-body">
        <div class="form-group">
          <label for="room-name">Namn</label>
          <input
            id="room-name"
            type="text"
            formControlName="name"
            placeholder="t.ex. Sal A3"
            maxlength="100"
          />
          @if (roomForm.get('name')?.invalid && roomForm.get('name')?.touched) {
            <span class="error-msg">Namn krävs</span>
          }
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="room-campus">Campus</label>
            <select id="room-campus" formControlName="campusId">
              <option [ngValue]="null">Välj campus</option>
              @for (campus of campusOptions; track campus.id) {
                <option [ngValue]="campus.id">{{ campus.city }}</option>
              }
            </select>
            @if (roomForm.get('campusId')?.invalid && roomForm.get('campusId')?.touched) {
              <span class="error-msg">Campus krävs</span>
            }
          </div>

          <div class="form-group">
            <label for="room-type">Rumstyp</label>
            <select id="room-type" formControlName="roomTypeId">
              <option [ngValue]="null">Välj typ</option>
              @for (type of roomTypes; track type.id) {
                <option [ngValue]="type.id">{{ type.name }}</option>
              }
            </select>
            @if (roomForm.get('roomTypeId')?.invalid && roomForm.get('roomTypeId')?.touched) {
              <span class="error-msg">Rumstyp krävs</span>
            }
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="room-cap">Kapacitet</label>
            <input id="room-cap" type="number" formControlName="capacity" min="1" placeholder="–" />
          </div>

          <div class="form-group">
            <label for="room-floor">Våning</label>
            <input
              id="room-floor"
              type="text"
              formControlName="floor"
              placeholder="t.ex. 2"
              maxlength="20"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="room-notes">Anteckningar</label>
          <input
            id="room-notes"
            type="text"
            formControlName="notes"
            placeholder="Valfri notering..."
            maxlength="200"
          />
          <span
            class="char-count"
            [class.at-limit]="(roomForm.controls.notes.value?.length ?? 0) >= 200"
          >
            {{ roomForm.controls.notes.value?.length ?? 0 }}/200
          </span>
        </div>

        <div class="form-section">
          <p class="form-section-title">Utrustning i rummet</p>
          @if (!assetTypes.length) {
            <p class="form-section-hint">Inga utrustningstyper är definierade ännu.</p>
          } @else {
            <div class="pill-grid">
              @for (assetType of assetTypes; track assetType.id) {
                <app-selectable-pill
                  [selected]="isAssetSelected(assetType.id)"
                  (toggle)="toggleAsset(assetType.id)"
                >
                  {{ assetType.description }}
                </app-selectable-pill>
              }
            </div>
          }
        </div>
      </div>

      <div class="modal-footer">
        <app-button variant="tertiary" (clicked)="onCancel()">Avbryt</app-button>
        @if (initialData) {
          <app-button variant="danger" (clicked)="onDelete()" [disabled]="isSubmitting()">
            Ta bort
          </app-button>
        }
        <app-button type="submit" variant="primary" [disabled]="roomForm.invalid || isSubmitting()">
          {{ isSubmitting() ? 'Sparar...' : initialData ? 'Spara ändringar' : 'Skapa rum' }}
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

        input,
        select {
          @include input-base;
        }
      }

      .error-msg {
        font-size: var(--font-sm);
        color: var(--color-danger);
      }

      .char-count {
        text-align: right;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: -0.25rem;

        &.at-limit {
          color: var(--color-danger, #ef4444);
          font-weight: 600;
        }
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
export class RoomFormModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);

  private config: RoomFormModalConfig = this.modalService.modalData();
  protected initialData = this.config?.room;
  protected campusOptions = this.config?.campusOptions ?? [];
  protected roomTypes = this.config?.roomTypes ?? [];
  protected assetTypes = this.config?.assetTypes ?? [];

  readonly isSubmitting = signal(false);
  private selectedAssetIds = signal<number[]>(this.config?.initialAssetIds ?? []);

  readonly roomForm = new FormGroup({
    name: new FormControl(this.initialData?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    campusId: new FormControl<number | null>(this.initialData?.campusId ?? null, {
      validators: [Validators.required],
    }),
    roomTypeId: new FormControl<number | null>(this.initialData?.roomTypeId ?? null, {
      validators: [Validators.required],
    }),
    capacity: new FormControl<number | null>(this.initialData?.capacity ?? null),
    floor: new FormControl<string | null>(this.initialData?.floor ?? null),
    notes: new FormControl<string | null>(this.initialData?.notes ?? null),
  });

  isAssetSelected(id: number): boolean {
    return this.selectedAssetIds().includes(id);
  }

  toggleAsset(id: number): void {
    const current = this.selectedAssetIds();
    if (current.includes(id)) {
      this.selectedAssetIds.set(current.filter((a) => a !== id));
    } else {
      this.selectedAssetIds.set([...current, id]);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.roomForm.invalid) return;

    const value = this.roomForm.getRawValue();
    if (!value.campusId || !value.roomTypeId || !value.name.trim()) return;

    const capacity = value.capacity;

    const payload: RoomFormPayload = {
      campusId: value.campusId,
      roomTypeId: value.roomTypeId,
      name: value.name.trim(),
      capacity: capacity === null || capacity === undefined || capacity === 0 ? null : capacity,
      floor: value.floor?.trim() || null,
      notes: value.notes?.trim() || null,
      assetIds: this.selectedAssetIds(),
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
    if (!this.config?.onDelete || !this.initialData?.roomId) return;

    const confirmed = await this.confirmService.danger(
      `Rummet "${this.initialData.name}" kommer att tas bort permanent.`,
      'Ta bort rum',
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onDelete(this.initialData.roomId);
    } catch {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.modalService.close();
  }
}
