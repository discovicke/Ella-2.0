import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { AssetTypeResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';

export interface AssetTypesModalConfig {
  assetTypes: AssetTypeResponseDto[];
  refreshAssetTypes: () => Promise<AssetTypeResponseDto[]>;
  onCreate: (description: string) => Promise<void>;
  onUpdate: (id: number, description: string) => Promise<void>;
  onDelete: (assetType: AssetTypeResponseDto) => Promise<void>;
}

@Component({
  selector: 'app-asset-types-modal',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="asset-types-form">
      <!-- Create row -->
      <div class="at-create-row">
        <input
          type="text"
          class="at-input"
          placeholder="Ny utrustningstyp, t.ex. Projektor..."
          [value]="newDescription()"
          (input)="updateNewDescription($event)"
          (keydown.enter)="createAssetType()"
        />
        <app-button variant="primary" [disabled]="isSaving()" (clicked)="createAssetType()">
          + Lägg till
        </app-button>
      </div>

      <!-- List -->
      <div class="at-list">
        @if (!currentAssetTypes().length) {
          <p class="at-empty">Inga utrustningstyper ännu.</p>
        }
        @for (assetType of currentAssetTypes(); track assetType.id) {
          <div class="at-row">
            @if (editingId() === assetType.id) {
              <input
                class="at-input at-edit-input"
                type="text"
                [value]="editDraft()"
                (input)="updateDraft($event)"
                (keydown.enter)="saveEdit(assetType.id)"
                (keydown.escape)="cancelEdit()"
              />
              <div class="at-actions">
                <app-button
                  variant="primary"
                  [disabled]="isSaving()"
                  (clicked)="saveEdit(assetType.id)"
                >
                  Spara
                </app-button>
                <app-button variant="tertiary" (clicked)="cancelEdit()"> Avbryt </app-button>
              </div>
            } @else {
              <span class="at-name">{{ assetType.description }}</span>
              <div class="at-actions">
                <button
                  type="button"
                  class="btn-icon-sm"
                  title="Redigera"
                  (click)="startEdit(assetType)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="btn-icon-sm danger"
                  title="Ta bort"
                  (click)="deleteAssetType(assetType)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            }
          </div>
        }
      </div>

      <div class="at-footer">
        <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .asset-types-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .at-create-row {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .at-input {
        @include input-base;
        flex: 1;
      }

      .at-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        overflow: hidden;
        max-height: 400px;
        overflow-y: auto;
      }

      .at-empty {
        padding: 1.5rem;
        text-align: center;
        color: var(--color-text-muted);
        font-size: var(--font-sm);
        margin: 0;
      }

      .at-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg-card);
        transition: background 0.15s ease;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: var(--color-bg-panel);
        }
      }

      .at-name {
        font-size: var(--font-sm);
        font-weight: 500;
        color: var(--color-text-primary);
        flex: 1;
        min-width: 0;
      }

      .at-edit-input {
        flex: 1;
      }

      .at-actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex-shrink: 0;
      }

      .btn-icon-sm {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: all 0.15s ease;

        svg {
          width: 0.9rem;
          height: 0.9rem;
          stroke: currentColor;
        }

        &:hover {
          background: var(--color-primary-surface);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        &.danger:hover {
          background: var(--color-danger-surface);
          border-color: var(--color-danger);
          color: var(--color-danger);
        }
      }

      .at-footer {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetTypesModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);

  private config: AssetTypesModalConfig = this.modalService.modalData();

  readonly currentAssetTypes = signal<AssetTypeResponseDto[]>(this.config?.assetTypes ?? []);
  readonly newDescription = signal('');
  readonly editingId = signal<number | null>(null);
  readonly editDraft = signal('');
  readonly isSaving = signal(false);

  updateNewDescription(event: Event): void {
    this.newDescription.set((event.target as HTMLInputElement).value);
  }

  updateDraft(event: Event): void {
    this.editDraft.set((event.target as HTMLInputElement).value);
  }

  startEdit(assetType: AssetTypeResponseDto): void {
    this.editingId.set(assetType.id);
    this.editDraft.set(assetType.description);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  private async refreshList(): Promise<void> {
    const fresh = await this.config.refreshAssetTypes();
    this.currentAssetTypes.set(fresh);
  }

  async createAssetType(): Promise<void> {
    const description = this.newDescription().trim();
    if (!description) return;

    this.isSaving.set(true);
    try {
      await this.config.onCreate(description);
      this.newDescription.set('');
      await this.refreshList();
    } catch {
      // error handled by parent
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveEdit(id: number): Promise<void> {
    const description = this.editDraft().trim();
    if (!description) return;

    this.isSaving.set(true);
    try {
      await this.config.onUpdate(id, description);
      this.cancelEdit();
      await this.refreshList();
    } catch {
      // error handled by parent
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteAssetType(assetType: AssetTypeResponseDto): Promise<void> {
    const confirmed = await this.confirmService.danger(
      `Vill du ta bort utrustningstypen "${assetType.description}"?`,
      'Ta bort utrustningstyp',
    );
    if (!confirmed) return;

    this.isSaving.set(true);
    try {
      await this.config.onDelete(assetType);
      await this.refreshList();
    } catch {
      // error handled by parent
    } finally {
      this.isSaving.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
