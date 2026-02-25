import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export interface BookingEditModalConfig {
  booking: BookingDetailedReadModel;
  onStatusChange: (bookingId: number, newStatus: BookingStatus) => Promise<void>;
}

@Component({
  selector: 'app-booking-edit-modal',
  imports: [DatePipe, ButtonComponent],
  template: `
    <div class="booking-detail">
      <!-- Booking Info -->
      <div class="detail-section">
        <h4 class="section-title">Bokning</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Rum</span>
            <span class="detail-value">{{ booking.roomName ?? '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Rumstyp</span>
            <span class="detail-value">{{ booking.roomType ?? '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Kapacitet</span>
            <span class="detail-value">{{ booking.roomCapacity ?? '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Våning</span>
            <span class="detail-value">{{ booking.roomFloor ?? '—' }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="section-title">Tid</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Datum</span>
            <span class="detail-value">{{ booking.startTime | date: 'yyyy-MM-dd' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tid</span>
            <span class="detail-value">
              {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
            </span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="section-title">Användare</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Namn</span>
            <span class="detail-value">{{ booking.userName ?? '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">E-post</span>
            <span class="detail-value">{{ booking.userEmail ?? '—' }}</span>
          </div>
        </div>
      </div>

      @if (booking.notes) {
        <div class="detail-section">
          <h4 class="section-title">Anteckningar</h4>
          <p class="notes-text">{{ booking.notes }}</p>
        </div>
      }

      <div class="detail-section">
        <h4 class="section-title">Status</h4>
        <div class="status-row">
          <span class="status-badge" [attr.data-status]="booking.status">
            {{ statusLabel(booking.status) }}
          </span>
          <span class="detail-meta">
            Skapad {{ booking.createdAt | date: 'yyyy-MM-dd HH:mm' }}
            @if (booking.updatedAt) {
              · Uppdaterad {{ booking.updatedAt | date: 'yyyy-MM-dd HH:mm' }}
            }
          </span>
        </div>
      </div>

      @if (booking.registrationCount) {
        <div class="detail-section">
          <h4 class="section-title">Registreringar</h4>
          <span class="detail-value">{{ booking.registrationCount }} st</span>
        </div>
      }

      <!-- Actions -->
      <div class="form-actions">
        <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>

        @if (booking.status === 'Cancelled' || booking.status === 'Expired') {
          <app-button
            variant="primary"
            [disabled]="isSubmitting()"
            (clicked)="onSetStatus('Active')"
          >
            {{ isSubmitting() ? 'Sparar...' : 'Aktivera' }}
          </app-button>
        }
        @if (booking.status === 'Active') {
          <app-button
            variant="danger"
            [disabled]="isSubmitting()"
            (clicked)="onSetStatus('Cancelled')"
          >
            {{ isSubmitting() ? 'Sparar...' : 'Avboka' }}
          </app-button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .booking-detail {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .section-title {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-secondary);
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem 1.5rem;

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .detail-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .detail-value {
        font-size: 0.9rem;
        color: var(--color-text-primary);
        font-weight: 500;
      }

      .notes-text {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-primary);
        line-height: 1.5;
      }

      .status-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;

        &[data-status='Active'] {
          background: var(--color-success-surface, #dcfce7);
          color: var(--color-success, #16a34a);
        }
        &[data-status='Cancelled'] {
          background: var(--color-danger-surface, #fde2e2);
          color: var(--color-danger, #dc2626);
        }
        &[data-status='Expired'] {
          background: var(--color-bg-panel);
          color: var(--color-text-muted);
        }
      }

      .detail-meta {
        font-size: 0.75rem;
        color: var(--color-text-muted);
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
export class BookingEditModalComponent {
  private readonly modalService = inject(ModalService);

  private config: BookingEditModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;

  readonly isSubmitting = signal(false);

  statusLabel(status?: BookingStatus): string {
    switch (status) {
      case BookingStatus.Active:
        return 'Aktiv';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '—';
    }
  }

  async onSetStatus(status: BookingStatus | string): Promise<void> {
    if (!this.booking.bookingId) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onStatusChange(this.booking.bookingId, status as BookingStatus);
    } catch {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
