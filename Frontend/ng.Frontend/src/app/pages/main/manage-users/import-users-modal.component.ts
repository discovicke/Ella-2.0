import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UserService } from '../../../shared/services/user.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  ImportUsersResponseDto,
  ClassResponseDto,
  CampusResponseDto,
  PermissionTemplateDto,
} from '../../../models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-import-users-modal',
  imports: [ButtonComponent],
  template: `
    <!-- Step dots -->
    <div class="steps">
      <div
        class="step"
        [class.active]="currentStep() === 'form'"
        [class.done]="currentStep() !== 'form'"
      ></div>
      <div class="step-line" [class.done]="currentStep() !== 'form'"></div>
      <div
        class="step"
        [class.active]="currentStep() === 'importing'"
        [class.done]="currentStep() === 'done'"
      ></div>
      <div class="step-line" [class.done]="currentStep() === 'done'"></div>
      <div class="step" [class.active]="currentStep() === 'done'"></div>
    </div>

    @if (unknownCampuses().length) {
      <div class="conflict-view">
        <div class="conflict-header">
          <div class="conflict-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3>Okända studieorter</h3>
            <p class="conflict-subtitle">
              {{ unknownCampuses().length }} studieort{{ unknownCampuses().length > 1 ? 'er' : '' }}
              saknas i systemet
            </p>
          </div>
        </div>
        <p class="conflict-description">
          Användare med dessa studieorter kommer inte att kopplas till ett campus. Du kan avbryta
          och lägga till campus manuellt först, eller fortsätta ändå.
        </p>
        <ul class="conflict-list">
          @for (name of unknownCampuses(); track name) {
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {{ name }}
            </li>
          }
        </ul>
        <div class="conflict-actions">
          <app-button variant="primary" [disabled]="isSubmitting()" (clicked)="onConfirmImport()">
            Fortsätt ändå
          </app-button>
          <app-button variant="tertiary" [disabled]="isSubmitting()" (clicked)="onAbortImport()">
            Avbryt
          </app-button>
        </div>
      </div>
    } @else if (isImporting()) {
      <div class="importing-view">
        <div class="importing-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3 class="importing-title">Importerar användare</h3>
        <p class="importing-subtitle">
          {{ selectedFile()?.name }} &middot; {{ selectedClass()?.className }}
        </p>
        <div class="progress-track">
          <div class="progress-bar"></div>
        </div>
        <p class="importing-hint">Detta kan ta en stund beroende på antalet användare...</p>
      </div>
    } @else if (!result()) {
      <form (submit)="$event.preventDefault(); onSubmit()" class="import-form">
        <p class="description">
          Importera användare från en CSV-fil. Varje användare får ett genererat platshållarlösenord
          och kopplas till den angivna klassen.
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
                <span class="hint">UTF-8, semikolon-separerad</span>
              </div>
            }
          </div>
          @if (fileError()) {
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
            {{ isSubmitting() ? 'Validerar...' : 'Importera' }}
          </app-button>
        </div>
      </form>
    } @else {
      <div class="result-view">
        <div class="result-icon" [class.has-errors]="result()!.errors.length">
          @if (!result()!.errors.length) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        </div>

        <h3 class="result-title">
          {{ result()!.errors.length ? 'Import klar med anmärkningar' : 'Import klar' }}
        </h3>
        <p class="result-class">Klass: {{ result()!.className }}</p>

        <div class="result-summary">
          <div class="result-stat success">
            <span class="stat-value">{{ result()!.created }}</span>
            <span class="stat-label">Skapade</span>
          </div>
          @if (result()!.updated) {
            <div class="result-stat info">
              <span class="stat-value">{{ result()!.updated }}</span>
              <span class="stat-label">Uppdaterade</span>
            </div>
          }
          <div class="result-stat warning">
            <span class="stat-value">{{ result()!.skipped }}</span>
            <span class="stat-label">Hoppade över</span>
          </div>
          <div class="result-stat neutral">
            <span class="stat-value">{{ result()!.totalRows }}</span>
            <span class="stat-label">Totalt</span>
          </div>
        </div>

        @if (result()!.errors.length) {
          <div class="result-errors">
            <p class="errors-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Detaljer ({{ result()!.errors.length }})
            </p>
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

      /* Step dots */
      .steps {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        margin-bottom: 0.5rem;
      }

      .step {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-border);
        transition: all 0.3s ease;

        &.active {
          background: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-surface);
        }

        &.done {
          background: var(--color-success, #16a34a);
        }
      }

      .step-line {
        width: 48px;
        height: 2px;
        background: var(--color-border);
        transition: background 0.3s ease;

        &.done {
          background: var(--color-success, #16a34a);
        }
      }

      /* Shared layout */
      .import-form,
      .result-view,
      .conflict-view,
      .importing-view {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      /* Conflict view */
      .conflict-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;

        h3 {
          margin: 0;
          font-size: var(--font-base);
          color: var(--color-text-primary);
        }
      }

      .conflict-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--color-warning-surface, rgba(217, 119, 6, 0.08));
        flex-shrink: 0;

        svg {
          width: 20px;
          height: 20px;
          stroke: var(--color-warning, #d97706);
        }
      }

      .conflict-subtitle {
        margin: 0.125rem 0 0;
        font-size: var(--font-xs);
        color: var(--color-text-muted);
      }

      .conflict-description {
        font-size: var(--font-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin: 0;
      }

      .conflict-list {
        margin: 0;
        padding: 0;
        list-style: none;
        background: var(--color-warning-surface, rgba(217, 119, 6, 0.08));
        border: 1px solid var(--color-warning, #d97706);
        border-radius: 0.75rem;
        overflow: hidden;

        li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          min-height: 40px;
          box-sizing: border-box;
          margin-block-end: 0;

          svg {
            width: 16px;
            height: 16px;
            stroke: var(--color-warning, #d97706);
            flex-shrink: 0;
          }

          span {
            flex: 1;
          }
        }
      }

      .conflict-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
      }

      /* Importing view */
      .importing-view {
        align-items: center;
        text-align: center;
        padding: 1rem 0;
        gap: 0.5rem;
      }

      .importing-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--color-primary-surface);
        margin-bottom: 0.25rem;

        svg {
          width: 28px;
          height: 28px;
          stroke: var(--color-primary);
          animation: bounce-down 1.2s ease-in-out infinite;
        }
      }

      @keyframes bounce-down {
        0%,
        100% {
          transform: translateY(-3px);
        }
        50% {
          transform: translateY(3px);
        }
      }

      .importing-title {
        margin: 0;
        font-size: var(--font-base);
        color: var(--color-text-primary);
      }

      .importing-subtitle {
        margin: 0;
        font-size: var(--font-sm);
        color: var(--color-text-secondary);
      }

      .progress-track {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--color-bg-panel);
        overflow: hidden;
        margin: 0.5rem 0;
      }

      .progress-bar {
        height: 100%;
        width: 40%;
        border-radius: 3px;
        background: linear-gradient(
          90deg,
          var(--color-primary) 0%,
          var(--color-primary-hover, #7b2eb3) 100%
        );
        animation: indeterminate 1.4s ease-in-out infinite;
      }

      @keyframes indeterminate {
        0% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(150%);
        }
        100% {
          transform: translateX(400%);
        }
      }

      .importing-hint {
        margin: 0;
        font-size: var(--font-xs);
        color: var(--color-text-muted);
      }

      /* Form view */
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
        gap: 0.75rem;
        margin-top: 0.25rem;
      }

      /* Result view */
      .result-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--color-success-surface, rgba(16, 185, 129, 0.1));
        align-self: center;

        svg {
          width: 28px;
          height: 28px;
          stroke: var(--color-success, #16a34a);
        }

        &.has-errors {
          background: var(--color-warning-surface, rgba(217, 119, 6, 0.08));

          svg {
            stroke: var(--color-warning, #d97706);
          }
        }
      }

      .result-title {
        margin: 0;
        font-size: var(--font-base);
        color: var(--color-text-primary);
        text-align: center;
      }

      .result-class {
        margin: 0;
        font-size: var(--font-sm);
        color: var(--color-text-secondary);
        text-align: center;
      }

      .result-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 0.5rem;
      }

      .result-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.125rem;
        padding: 0.625rem 0.5rem;
        border-radius: 0.75rem;
        border: 1px solid var(--color-border);
        background: var(--color-bg-panel);

        .stat-value {
          font-size: 1.25rem;
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
        &.info .stat-value {
          color: var(--color-primary, #2563eb);
        }
        &.warning .stat-value {
          color: var(--color-warning, #d97706);
        }
        &.neutral .stat-value {
          color: var(--color-text-primary);
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
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0 0 0.5rem;

          svg {
            width: 16px;
            height: 16px;
            stroke: var(--color-warning, #d97706);
            flex-shrink: 0;
          }
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
  private campusOptions: CampusResponseDto[] = this.config?.campusOptions ?? [];

  readonly isSubmitting = signal(false);
  readonly isImporting = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly isDragOver = signal(false);
  readonly result = signal<ImportUsersResponseDto | null>(null);
  readonly unknownCampuses = signal<string[]>([]);
  readonly selectedTemplateId = signal<number | null>(null);

  readonly currentStep = computed(() => {
    if (this.result()) return 'done';
    if (this.isImporting()) return 'importing';
    return 'form';
  });

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

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  private setFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.fileError.set('Filen måste vara en CSV-fil.');
      this.selectedFile.set(null);
      return;
    }
    if (file.size > ImportUsersModalComponent.MAX_FILE_SIZE) {
      this.fileError.set('Filen är för stor (max 10 MB).');
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
      const unknown = await this.findUnknownCampuses(file);
      if (unknown === null) return; // validation error already shown
      if (unknown.length > 0) {
        this.unknownCampuses.set(unknown);
        return;
      }

      await this.executeImport();
    } catch (err: any) {
      console.error('Import failed', err);
      const message = err?.error?.detail || err?.error || 'Importen misslyckades.';
      this.toastService.showError(typeof message === 'string' ? message : 'Importen misslyckades.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Returns unknown campus names, empty array if all match, or null if the CSV is invalid. */
  private async findUnknownCampuses(file: File): Promise<string[] | null> {
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.fileError.set('Kunde inte läsa filen. Kontrollera att den inte är skadad.');
      return null;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      this.fileError.set('CSV-filen verkar vara tom eller saknar datarader.');
      return null;
    }

    const headerCols = lines[0].split(';');
    if (headerCols.length < 10) {
      this.fileError.set(
        'CSV-formatet stöds inte. Filen måste vara semikolon-separerad med minst 10 kolumner.',
      );
      return null;
    }

    const dataLines = lines.slice(1);
    const csvCampuses = new Set<string>();
    for (const line of dataLines) {
      const cols = line.split(';');
      if (cols.length < 10) continue; // skip malformed rows
      const campus = cols.length > 25 ? cols[25]?.trim() : '';
      if (campus) csvCampuses.add(campus);
    }

    const knownNames = new Set(this.campusOptions.map((c) => c.city.toLowerCase()));
    return [...csvCampuses].filter((name) => !knownNames.has(name.toLowerCase()));
  }

  async onConfirmImport() {
    this.unknownCampuses.set([]);
    await this.executeImport();
  }

  onAbortImport() {
    this.unknownCampuses.set([]);
  }

  private async executeImport() {
    const file = this.selectedFile();
    const cls = this.selectedClass();
    if (!file || !cls) return;

    this.isSubmitting.set(true);
    this.isImporting.set(true);
    try {
      const res = await firstValueFrom(
        this.userService.importUsersFromCsv(
          file,
          cls.className,
          this.selectedTemplateId() ?? undefined,
        ),
      );
      this.unknownCampuses.set([]);
      this.result.set(res);
      const summary = [
        res.created ? `${res.created} skapade` : '',
        res.updated ? `${res.updated} uppdaterade` : '',
      ]
        .filter(Boolean)
        .join(', ');
      this.toastService.showSuccess(`${summary} i ${res.className}.`);
    } catch (err: any) {
      console.error('Import failed', err);
      const message = err?.error?.detail || err?.error || 'Importen misslyckades.';
      this.toastService.showError(typeof message === 'string' ? message : 'Importen misslyckades.');
    } finally {
      this.isSubmitting.set(false);
      this.isImporting.set(false);
    }
  }

  onCancel() {
    if (this.result()) {
      this.config?.onComplete?.();
    }
    this.modalService.close();
  }
}
