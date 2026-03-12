import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { BookingSlugResponseDto } from '../../../models/models';

@Component({
  selector: 'app-booking-slug-modal',
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="slug-modal-content">
      @if (slugData(); as data) {
        <p class="description">
          Denna länk tillåter användaren att boka rum utan att logga in. 
          Bokningar kommer att registreras i <strong>{{ data.userDisplayName }}</strong>s namn.
        </p>

        <div class="url-display">
          <input type="text" [value]="data.bookingUrl" readonly #urlInput />
          <app-button variant="secondary" size="sm" (clicked)="copyToClipboard(urlInput)">
            Kopiera
          </app-button>
        </div>
      } @else {
        <p class="error">Kunde inte ladda länkdata.</p>
      }

      <div class="modal-actions">
        <app-button variant="primary" (clicked)="close()">Stäng</app-button>
      </div>
    </div>
  `,
  styles: [`
    .slug-modal-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 0.5rem;
      color: var(--color-text-primary);
    }
    .description {
      color: var(--color-text-secondary);
      font-size: var(--font-sm);
      line-height: 1.6;
      margin: 0;
    }
    .url-display {
      display: flex;
      gap: 0.75rem;
      background: var(--color-bg-panel);
      padding: 0.75rem;
      border-radius: var(--radii-md);
      border: 1px solid var(--color-border);
      align-items: center;

      input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--color-text-primary);
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.8rem;
        outline: none;
        width: 100%;
      }
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
    .error {
      color: var(--color-danger);
      font-weight: 500;
    }
  `]
})
export class BookingSlugModalComponent {
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);

  // Use computed to safely get the data from the service
  readonly slugData = computed(() => this.modalService.modalData() as BookingSlugResponseDto);

  copyToClipboard(input: HTMLInputElement) {
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      this.toastService.showSuccess('Länken kopierad till urklipp!');
    });
  }

  close() {
    this.modalService.close();
  }
}