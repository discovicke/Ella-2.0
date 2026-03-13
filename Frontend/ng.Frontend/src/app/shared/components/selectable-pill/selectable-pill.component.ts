import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selectable-pill',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="pill"
      [class.pill--selected]="selected"
      (click)="onToggle()"
    >
      <svg *ngIf="selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
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
    }

    .pill svg {
      width: 0.9rem;
      height: 0.9rem;
      stroke: currentColor;
      flex-shrink: 0;
    }

    .pill:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .pill--selected {
      background: var(--color-primary-surface);
      border-color: var(--color-primary);
      color: var(--color-primary-on-surface);
      font-weight: 600;
    }
  `]
})
export class SelectablePillComponent {
  @Input() selected: boolean = false;
  @Output() toggle = new EventEmitter<void>();

  onToggle() {
    this.toggle.emit();
  }
}

