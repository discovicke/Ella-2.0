import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand' | 'asset' | 'class';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + variant">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: var(--radii-md);
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid transparent;

      svg {
        width: 0.875rem;
        height: 0.875rem;
      }
    }

    .badge--success {
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    
    .badge--danger {
      background: var(--color-danger-surface);
      color: var(--color-danger);
    }

    .badge--warning {
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }

    .badge--info {
      background: var(--color-info-surface);
      color: var(--color-info);
    }

    .badge--neutral {
      background: var(--color-bg-panel);
      color: var(--color-text-muted);
      border-color: var(--color-border);
    }

    .badge--brand {
      background: var(--color-primary-surface);
      color: var(--color-primary);
    }

    .badge--asset {
      background: var(--color-asset-bg);
      color: var(--color-asset-text);
      border-color: var(--color-asset-border);
    }

    .badge--class {
      background: var(--color-primary-surface);
      color: var(--color-primary);
    }
  `]
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
}
