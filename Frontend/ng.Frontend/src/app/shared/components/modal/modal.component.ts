import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  imports: [NgComponentOutlet],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class ModalComponent {
  // Vi injicerar servicen "protected" så vi kommer åt den i HTML-templaten
  protected modalService = inject(ModalService);

  // Signal för att trigga shake-animation - använder counter för att alltid trigga ny animation
  protected shakeCounter = signal(0);

  // Lyssna på escape-tangenten
  onEscapeKey() {
    if (this.modalService.isOpen()) {
      this.modalService.close();
    }
  }

  // TODO: Fixa shake på modalen
  // Trigga shake när man klickar utanför modalen (men stäng INTE)
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      // Trigga shake-animation
      this.triggerShake();
    }
  }

  private triggerShake() {
    // Incrementera counter för att alltid trigga ny animation
    this.shakeCounter.update((n) => n + 1);
  }
}
