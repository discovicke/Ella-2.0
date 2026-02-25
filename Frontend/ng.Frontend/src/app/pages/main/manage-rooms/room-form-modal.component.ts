import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { AssetTypeResponseDto, RoomDetailModel, RoomTypeResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

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
  imports: [ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="roomForm" (ngSubmit)="onSubmit()" class="room-form">
      <div class="form-group">
        <label for="room-name">Namn</label>
        <input id="room-name" type="text" formControlName="name" placeholder="t.ex. Sal A3" />
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
          <input id="room-floor" type="text" formControlName="floor" placeholder="t.ex. 2" />
        </div>
      </div>

      <div class="form-group">
        <label for="room-notes">Anteckningar</label>
        <input
          id="room-notes"
          type="text"
          formControlName="notes"
          placeholder="Valfri notering..."
        />
      </div>

      <div class="assets-section">
        <p class="assets-title">Assets i rummet</p>
        @if (!assetTypes.length) {
          <p class="assets-hint">Inga utrustningstyper är definierade ännu.</p>
        } @else {
          <div class="asset-pill-grid">
            @for (assetType of assetTypes; track assetType.id) {
              <button
                type="button"
                class="asset-pill"
                [class.on]="isAssetSelected(assetType.id)"
                (click)="toggleAsset(assetType.id)"
              >
                @if (isAssetSelected(assetType.id)) {
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
                {{ assetType.description }}
              </button>
            }
          </div>
        }
      </div>

      <div class="form-actions">
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

      .room-form {
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

        input,
        select {
          @include input-base;
        }
      }

      .error-msg {
        font-size: var(--font-sm);
        color: var(--color-danger);
      }

      .assets-section {
        @include stack(0.5rem);
        padding: 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background: var(--color-bg-panel);
      }

      .assets-title {
        margin: 0;
        font-size: var(--font-sm);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .assets-hint {
        margin: 0;
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
      }

      .asset-pill-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .asset-pill {
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
