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
    <div class="booking-modal">
      <!-- Hero: Room + Status -->
      <div class="modal-hero" [attr.data-status]="booking.status">
        <div class="hero-top">
          <span class="status-badge" [attr.data-status]="booking.status">
            {{ statusLabel(booking.status) }}
          </span>
        </div>
        <h3 class="hero-room">{{ booking.roomName ?? 'Okänt rum' }}</h3>
        <div class="hero-meta">
          <span class="hero-detail">{{ booking.roomType ?? '' }}</span>
          @if (booking.roomFloor) {
            <span class="hero-sep">·</span>
            <span class="hero-detail">Våning {{ booking.roomFloor }}</span>
          }
          @if (booking.roomCapacity) {
            <span class="hero-sep">·</span>
            <span class="hero-detail">{{ booking.roomCapacity }} platser</span>
          }
          @if (booking.campusCity) {
            <span class="hero-sep">·</span>
            <span class="hero-detail">{{ booking.campusCity }}</span>
          }
        </div>
        @if (parseAssets(booking.roomAssets).length) {
          <div class="hero-assets">
            @for (asset of parseAssets(booking.roomAssets); track asset) {
              <span class="asset-chip">{{ asset }}</span>
            }
          </div>
        }
      </div>

      <!-- Info rows -->
      <div class="info-rows">
        <div class="info-row">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="info-content">
            <span class="info-primary">
              {{ booking.startTime | date: 'EEEE d MMMM yyyy' : '' : 'sv' }}
            </span>
            <span class="info-secondary">
              {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
            </span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div class="info-content">
            <span class="info-primary">{{ booking.userName ?? '—' }}</span>
            <span class="info-secondary">{{ booking.userEmail ?? '' }}</span>
          </div>
        </div>

        @if (booking.registrationCount) {
          <div class="info-row">
            <div class="info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div class="info-content">
              <span class="info-primary"
                >{{ booking.registrationCount }} registrering{{
                  booking.registrationCount !== 1 ? 'ar' : ''
                }}</span
              >
            </div>
          </div>
        }
      </div>

      @if (booking.notes) {
        <div class="notes-section">
          <span class="notes-label">Anteckning</span>
          <p class="notes-text">{{ booking.notes }}</p>
        </div>
      }

      <!-- Footer: meta + actions -->
      <div class="modal-footer">
        <span class="meta-text">
          Skapad {{ booking.createdAt | date: 'yyyy-MM-dd HH:mm' }}
          @if (booking.updatedAt) {
            · Uppdaterad {{ booking.updatedAt | date: 'yyyy-MM-dd HH:mm' }}
          }
        </span>
        <div class="footer-actions">
          <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>

          @if (booking.status === BookingStatus.Cancelled && !hasEnded()) {
            <app-button
              variant="primary"
              [disabled]="isSubmitting()"
              (clicked)="onSetStatus(BookingStatus.Active)"
            >
              {{ isSubmitting() ? 'Sparar...' : 'Aktivera' }}
            </app-button>
          }
          @if (booking.status === BookingStatus.Active) {
            <app-button
              variant="danger"
              [disabled]="isSubmitting()"
              (clicked)="onSetStatus(BookingStatus.Cancelled)"
            >
              {{ isSubmitting() ? 'Sparar...' : 'Avboka' }}
            </app-button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .booking-modal {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      /* ── Hero ── */
      .modal-hero {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 20px 24px;
        margin: -24px -24px 0;
        background: var(--color-bg-panel);
        border-bottom: 1px solid var(--color-border);
      }

      .hero-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hero-room {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--color-text-primary);
        line-height: 1.3;
      }

      .hero-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .hero-detail {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      .hero-sep {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        opacity: 0.5;
      }

      .hero-assets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 2px;
      }

      .asset-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 10px;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.7rem;
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
          border: 1px solid var(--color-border);
        }
      }

      /* ── Info rows ── */
      .info-rows {
        display: flex;
        flex-direction: column;
        padding: 20px 0;
        gap: 0;
      }

      .info-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 0;

        & + .info-row {
          border-top: 1px solid var(--color-border);
        }
      }

      .info-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: var(--color-primary-surface);
        border-radius: 8px;
        flex-shrink: 0;

        svg {
          width: 16px;
          height: 16px;
          stroke: var(--color-primary);
        }
      }

      .info-content {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }

      .info-primary {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-primary);

        &::first-letter {
          text-transform: uppercase;
        }
      }

      .info-secondary {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      /* ── Notes ── */
      .notes-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 16px;
        background: var(--color-bg-panel);
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }

      .notes-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-muted);
      }

      .notes-text {
        margin: 0;
        font-size: 0.85rem;
        color: var(--color-text-primary);
        line-height: 1.5;
      }

      /* ── Footer ── */
      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 16px;
        margin-top: 4px;
        flex-wrap: wrap;
      }

      .meta-text {
        font-size: 0.72rem;
        color: var(--color-text-muted);
      }

      .footer-actions {
        display: flex;
        gap: 10px;
        margin-left: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingEditModalComponent {
  protected readonly BookingStatus = BookingStatus;
  private readonly modalService = inject(ModalService);

  private config: BookingEditModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;

  readonly isSubmitting = signal(false);

  parseAssets(assetsStr: string | null | undefined): string[] {
    if (!assetsStr) return [];
    return assetsStr.split('|||').filter((a) => a.trim().length > 0);
  }

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

  hasEnded(): boolean {
    const end = new Date(this.booking.endTime ?? 0);
    return end < new Date();
  }

  async onSetStatus(status: BookingStatus): Promise<void> {
    if (!this.booking.bookingId) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onStatusChange(this.booking.bookingId, status);
    } catch {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
