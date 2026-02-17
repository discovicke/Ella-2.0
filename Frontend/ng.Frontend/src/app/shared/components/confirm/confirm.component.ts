import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [],
  templateUrl: './confirm.component.html',
  styleUrl: './confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmComponent {
  protected readonly confirmService = inject(ConfirmService);

  /** Incremented to re-trigger the shake animation each time. */
  protected readonly shakeCounter = signal(0);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.confirmService.isOpen()) return;
    if (event.key === 'Escape') {
      this.confirmService.cancel();
    } else if (event.key === 'Enter') {
      this.confirmService.confirm();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-backdrop')) {
      this.triggerShake();
    }
  }

  private triggerShake(): void {
    this.shakeCounter.update((n) => n + 1);
  }
}
