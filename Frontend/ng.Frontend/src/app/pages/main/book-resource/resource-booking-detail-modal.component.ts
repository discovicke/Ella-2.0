import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ResourceService } from '../../../core/services/resource.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ResourceBookingResponseDto } from '../../../models/models';
import { firstValueFrom } from 'rxjs';

export interface ResourceBookingDetailModalConfig {
  booking: ResourceBookingResponseDto;
  onDeleted?: () => void;
}

@Component({
  selector: 'app-resource-booking-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent],
  template: `
    <div class="booking-modal">
      <header class="modal-hero-banner">
        <div class="header-top">
          <h3 class="room-name">{{ booking.resourceName }}</h3>
        </div>
      </header>

      <main class="modal-content-body">
        <section class="info-card">
          <div class="info-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="info-card-content">
            <label>Tid och datum</label>
            <div class="info-card-value info-card-value--large">
              {{ booking.startTime | date: 'EEEE d MMMM yyyy' : '' : 'sv' }}
            </div>
            <div class="time-cluster">
              <span class="info-card-sub">
                {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
              </span>
            </div>
          </div>
        </section>

        <section class="info-card">
          <div class="info-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div class="info-card-content">
            <label>Bokat av</label>
            <div class="info-card-value">{{ booking.userName }}</div>
          </div>
        </section>

        @if (booking.notes) {
          <section class="form-section">
            <label class="notes-label">Anteckningar</label>
            <div class="notes-box">
              {{ booking.notes }}
            </div>
          </section>
        }
      </main>

      <footer class="modal-footer modal-footer--between">
        <div class="footer-left">
          <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>
        </div>
        
        <div class="footer-actions">
          <app-button variant="danger" [disabled]="isDeleting()" (clicked)="onDelete()">
            {{ isDeleting() ? 'Avbokar...' : 'Avboka' }}
          </app-button>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    @use 'styles/mixins' as *;

    .booking-modal {
      display: flex;
      flex-direction: column;
      color: var(--color-text-primary);
      font-family: var(--font-family);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .room-name {
      @include heading(3);
      margin: 0;
      line-height: 1.2;
      color: var(--color-text-primary);
    }

    .time-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .notes-label {
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 0.25rem;
    }

    .notes-box {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--color-text-primary);
      white-space: pre-wrap;
    }

    .footer-actions {
      display: flex;
      gap: 12px;
    }

    @include breakpoint-down('sm') {
      .modal-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .footer-left, .footer-actions {
        display: flex;
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceBookingDetailModalComponent {
  private modalService = inject(ModalService);
  private confirmService = inject(ConfirmService);
  private resourceService = inject(ResourceService);
  private toastService = inject(ToastService);

  private config: ResourceBookingDetailModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;

  isDeleting = signal(false);

  async onDelete(): Promise<void> {
    if (!this.booking.id) return;

    const confirmed = await this.confirmService.danger(
      'Är du säker på att du vill avboka resursen?',
      'Avboka resurs'
    );

    if (!confirmed) return;

    this.isDeleting.set(true);
    try {
      await firstValueFrom(this.resourceService.deleteBooking(this.booking.id));
      this.toastService.showSuccess('Bokningen är avbokad.');
      if (this.config.onDeleted) {
        this.config.onDeleted();
      }
      this.onClose();
    } catch (error) {
      this.toastService.showError('Kunde inte avboka resursen.');
    } finally {
      this.isDeleting.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}

