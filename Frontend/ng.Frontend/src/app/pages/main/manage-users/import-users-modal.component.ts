import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UserService } from '../../../shared/services/user.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  ImportUsersResponseDto,
  ClassResponseDto,
  PermissionTemplateDto,
} from '../../../models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-import-users-modal',
  imports: [ButtonComponent],
  template: `
    @if (!result()) {
      <form (submit)="$event.preventDefault(); onSubmit()" class="import-form">
        <p class="description">
          Importera användare från en CSV-fil (UTF-8, semikolon-separerad). Varje användare får ett
          genererat platshållarlösenord och kopplas till den angivna klassen.
        </p>

        <div class="form-group">
          <label>Klass</label>
          <div class="class-search-wrapper">
            @if (selectedClass()) {
              <div class="selected-class">
                <span>{{ selectedClass()!.className }}</span>
                <button type="button" class="clear-class" (click)="clearClass()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            } @else {
              <div class="search-input-wrap">
                <svg
                  class="search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  [value]="classSearch()"
                  (input)="onClassSearchInput($event)"
                  (focus)="showClassDropdown.set(true)"
                  (blur)="hideClassDropdown()"
                  placeholder="Sök klass..."
                  autocomplete="off"
                />
              </div>
            }
            @if (showClassDropdown() && !selectedClass()) {
              <ul class="class-dropdown">
                @for (cls of filteredClasses(); track cls.id) {
                  <li (mousedown)="selectClass(cls)">
                    {{ cls.className }}
                  </li>
                } @empty {
                  <li class="no-results">Inga klasser hittades</li>
                }
              </ul>
            }
          </div>
          @if (!selectedClass() && classError()) {
            <span class="error-msg">{{ classError() }}</span>
          }
        </div>

        <div class="form-group">
          <label>Roll</label>
          <select class="role-select" (change)="onRoleChange($event)">
            <option [value]="''">Ingen roll</option>
            @for (template of roleOptions; track template.id) {
              <option [value]="template.id">{{ template.label }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>CSV-fil</label>
          <div
            class="drop-zone"
            [class.has-file]="selectedFile()"
            [class.drag-over]="isDragOver()"
            (click)="fileInput.click()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <input #fileInput type="file" accept=".csv" hidden (change)="onFileSelected($event)" />

            @if (selectedFile()) {
              <div class="file-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div class="file-details">
                  <span class="file-name">{{ selectedFile()!.name }}</span>
                  <span class="file-size">{{ formatFileSize(selectedFile()!.size) }}</span>
                </div>
                <button type="button" class="remove-file" (click)="removeFile($event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            } @else {
              <div class="drop-prompt">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Dra och släpp en CSV-fil här, eller klicka för att välja</span>
                <span class="hint">CSV (UTF-8, semikolon-separerad)</span>
              </div>
            }
          </div>
          @if (!selectedFile() && fileError()) {
            <span class="error-msg">{{ fileError() }}</span>
          }
        </div>

        <div class="form-actions">
          <app-button variant="tertiary" (clicked)="onCancel()">Avbryt</app-button>
          <app-button
            type="submit"
            variant="primary"
            [disabled]="!selectedClass() || !selectedFile() || isSubmitting()"
          >
            {{ isSubmitting() ? 'Importerar...' : 'Importera' }}
          </app-button>
        </div>
      </form>
    } @else {
      <div class="result-view">
        <div class="result-summary">
          <div class="result-stat success">
            <span class="stat-value">{{ result()!.created }}</span>
            <span class="stat-label">Skapade</span>
          </div>
          <div class="result-stat warning">
            <span class="stat-value">{{ result()!.skipped }}</span>
            <span class="stat-label">Hoppade över</span>
          </div>
          <div class="result-stat neutral">
            <span class="stat-value">{{ result()!.totalRows }}</span>
            <span class="stat-label">Totalt rader</span>
          </div>
        </div>

        <div class="result-details">
          <p>
            Klass: <strong>{{ result()!.className }}</strong>
          </p>
        </div>

        @if (result()!.errors.length) {
          <div class="result-errors">
            <p class="errors-title">Detaljer ({{ result()!.errors.length }})</p>
            <ul>
              @for (error of result()!.errors; track error) {
                <li>{{ error }}</li>
              }
            </ul>
          </div>
        }

        <div class="form-actions">
          <app-button variant="primary" (clicked)="onCancel()">Stäng</app-button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .import-form,
      .result-view {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .description {
        font-size: var(--font-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin: 0;
      }

      .form-group {
        @include stack(0.5rem);

        label {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        > input[type='text'] {
          @include input-base;
        }
      }

      .class-search-wrapper {
        position: relative;
        height: 40px;
      }

      .role-select {
        width: 100%;
        height: 40px;
        padding: 0 12px;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        background: var(--color-bg-panel);
        color: var(--color-text-primary);
        font-size: var(--font-sm);
        box-sizing: border-box;
        transition: all 0.2s ease;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-surface);
        }
      }

      .search-input-wrap {
        position: relative;
        height: 100%;

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          stroke: var(--color-text-muted);
          pointer-events: none;
        }

        input {
          width: 100%;
          height: 100%;
          padding: 0 12px 0 38px;
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          background: var(--color-bg-panel);
          color: var(--color-text-primary);
          font-size: var(--font-sm);
          box-sizing: border-box;
          transition: all 0.2s ease;

          &::placeholder {
            color: var(--color-text-muted);
          }
          &:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px var(--color-primary-surface);
          }
        }
      }

      .selected-class {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 100%;
        padding: 0 12px 0 38px;
        border: 1px solid var(--color-primary);
        border-radius: 0.5rem;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        font-weight: 600;
        font-size: var(--font-sm);
        box-sizing: border-box;
      }

      .clear-class {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--color-primary);
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.15s ease;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          opacity: 1;
        }
      }

      .class-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 10;
        margin: 4px 0 0;
        padding: 4px 0;
        list-style: none;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
        max-height: 200px;
        overflow-y: auto;

        li {
          padding: 8px 12px;
          cursor: pointer;
          font-size: var(--font-sm);
          color: var(--color-text-primary);

          &:hover {
            background: var(--color-primary-surface);
          }

          &.no-results {
            color: var(--color-text-muted);
            cursor: default;
            font-style: italic;

            &:hover {
              background: none;
            }
          }
        }
      }

      .error-msg {
        font-size: var(--font-sm);
        color: var(--color-danger);
      }

      .drop-zone {
        border: 2px dashed var(--color-border);
        border-radius: 0.75rem;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--color-bg-panel);

        &:hover,
        &.drag-over {
          border-color: var(--color-primary);
          background: var(--color-primary-surface);
        }

        &.has-file {
          border-style: solid;
          border-color: var(--color-primary);
          background: var(--color-primary-surface);
          padding: 1rem;
        }
      }

      .drop-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-text-secondary);
        text-align: center;

        svg {
          width: 32px;
          height: 32px;
          stroke: var(--color-text-muted);
        }

        span {
          font-size: var(--font-sm);
        }

        .hint {
          font-size: var(--font-xs);
          color: var(--color-text-muted);
        }
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        > svg {
          width: 24px;
          height: 24px;
          stroke: var(--color-primary);
          flex-shrink: 0;
        }
      }

      .file-details {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
        flex: 1;
      }

      .file-name {
        font-weight: 600;
        font-size: var(--font-sm);
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-size {
        font-size: var(--font-xs);
        color: var(--color-text-secondary);
      }

      .remove-file {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          background: var(--color-danger-surface, rgba(220, 38, 38, 0.1));
          color: var(--color-danger);
        }
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      /* Result view */
      .result-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
      }

      .result-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid var(--color-border);
        background: var(--color-bg-panel);

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: var(--font-xs);
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        &.success .stat-value {
          color: var(--color-success, #16a34a);
        }
        &.warning .stat-value {
          color: var(--color-warning, #d97706);
        }
        &.neutral .stat-value {
          color: var(--color-text-primary);
        }
      }

      .result-details {
        font-size: var(--font-sm);
        color: var(--color-text-secondary);

        p {
          margin: 0;
        }
      }

      .result-errors {
        border: 1px solid var(--color-border);
        border-radius: 0.75rem;
        padding: 0.75rem;
        background: var(--color-bg-panel);
        max-height: 200px;
        overflow-y: auto;

        .errors-title {
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0 0 0.5rem;
        }

        ul {
          margin: 0;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        li {
          font-size: var(--font-xs);
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportUsersModalComponent {
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);

  private config = this.modalService.modalData();
  protected classOptions: ClassResponseDto[] = this.config?.classOptions ?? [];
  protected roleOptions: PermissionTemplateDto[] = this.config?.roleOptions ?? [];

  readonly isSubmitting = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly isDragOver = signal(false);
  readonly result = signal<ImportUsersResponseDto | null>(null);
  readonly selectedTemplateId = signal<number | null>(null);

  // Class search state
  readonly classSearch = signal('');
  readonly selectedClass = signal<ClassResponseDto | null>(null);
  readonly showClassDropdown = signal(false);
  readonly classError = signal<string | null>(null);

  readonly filteredClasses = computed(() => {
    const query = this.classSearch().toLowerCase().trim();
    if (!query) return this.classOptions;
    return this.classOptions.filter((c) => c.className.toLowerCase().includes(query));
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setFile(file);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.setFile(file);
    }
  }

  private setFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.fileError.set('Filen måste vara en CSV-fil.');
      this.selectedFile.set(null);
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onClassSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.classSearch.set(value);
    this.showClassDropdown.set(true);
  }

  selectClass(cls: ClassResponseDto) {
    this.selectedClass.set(cls);
    this.classSearch.set('');
    this.showClassDropdown.set(false);
    this.classError.set(null);
  }

  clearClass() {
    this.selectedClass.set(null);
    this.classSearch.set('');
  }

  hideClassDropdown() {
    setTimeout(() => this.showClassDropdown.set(false), 200);
  }

  onRoleChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTemplateId.set(value ? Number(value) : null);
  }

  async onSubmit() {
    const file = this.selectedFile();
    const cls = this.selectedClass();
    if (!cls) {
      this.classError.set('Välj en klass.');
      return;
    }
    if (!file) return;

    this.isSubmitting.set(true);
    try {
      const res = await firstValueFrom(
        this.userService.importUsersFromCsv(
          file,
          cls.className,
          this.selectedTemplateId() ?? undefined,
        ),
      );
      this.result.set(res);
      this.toastService.showSuccess(`${res.created} användare importerade till ${res.className}.`);
    } catch (err: any) {
      console.error('Import failed', err);
      const message = err?.error?.detail || err?.error || 'Importen misslyckades.';
      this.toastService.showError(typeof message === 'string' ? message : 'Importen misslyckades.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel() {
    if (this.result()) {
      this.config?.onComplete?.();
    }
    this.modalService.close();
  }
}
