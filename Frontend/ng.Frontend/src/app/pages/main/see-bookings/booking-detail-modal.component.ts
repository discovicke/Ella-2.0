import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export interface BookingDetailModalConfig {
  booking: BookingDetailedReadModel;
  onCancel: (bookingId: number) => Promise<void>;
}

@Component({
  selector: 'app-booking-detail-modal',
  imports: [DatePipe, ButtonComponent],
  template: `
    <div class="detail-modal">
      <!-- Hero -->
      <div class="modal-hero" [attr.data-status]="booking.status">
        <div class="hero-top">
          <span class="status-badge" [attr.data-status]="booking.status">
            {{ statusLabel(booking.status) }}
          </span>
          @if (booking.status === 'Active') {
            <span class="countdown">{{ getCountdownLabel() }}</span>
          }
        </div>
        <h3 class="hero-room">{{ booking.roomName ?? 'Okänt rum' }}</h3>
        <div class="hero-meta">
          <span class="meta-item">{{ booking.roomType ?? '' }}</span>
          @if (booking.roomFloor) {
            <span class="meta-sep">·</span>
            <span class="meta-item">Våning {{ booking.roomFloor }}</span>
          }
          @if (booking.roomCapacity) {
            <span class="meta-sep">·</span>
            <span class="meta-item">{{ booking.roomCapacity }} platser</span>
          }
          @if (booking.campusCity) {
            <span class="meta-sep">·</span>
            <span class="meta-item">{{ booking.campusCity }}</span>
          }
        </div>
        @if (assets.length) {
          <div class="hero-assets">
            @for (asset of assets; track asset) {
              <span class="asset-chip">{{ asset }}</span>
            }
          </div>
        }
      </div>

      <!-- Details -->
      <div class="detail-rows">
        <div class="detail-row">
          <div class="detail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="detail-content">
            <span class="detail-primary">
              {{ booking.startTime | date: 'EEEE d MMMM yyyy' : '' : 'sv' }}
            </span>
            <span class="detail-secondary">
              {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
            </span>
          </div>
        </div>

        @if (booking.notes) {
          <div class="detail-row">
            <div class="detail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div class="detail-content">
              <span class="detail-primary">{{ booking.notes }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>
        @if (booking.status === 'Active') {
          <app-button
            variant="danger"
            [disabled]="isCancelling()"
            (clicked)="onCancel()"
          >
            {{ isCancelling() ? 'Avbokar...' : 'Avboka' }}
          </app-button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .detail-modal {
        display: flex;
        flex-direction: column;
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
        gap: 10px;
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

      .meta-item {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      .meta-sep {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        opacity: 0.5;
      }

      .countdown {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--color-primary);
        letter-spacing: 0.02em;
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

      /* ── Detail rows ── */
      .detail-rows {
        display: flex;
        flex-direction: column;
        padding: 20px 0;
      }

      .detail-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 0;

        & + .detail-row {
          border-top: 1px solid var(--color-border);
        }
      }

      .detail-icon {
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

      .detail-content {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }

      .detail-primary {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-primary);

        &::first-letter {
          text-transform: uppercase;
        }
      }

      .detail-secondary {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      /* ── Footer ── */
      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 16px;
        margin-top: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailModalComponent {
  private readonly modalService = inject(ModalService);

  private config: BookingDetailModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;
  protected assets = this.parseAssets(this.config.booking.roomAssets);

  readonly isCancelling = signal(false);

  private parseAssets(assetsStr: string | null | undefined): string[] {
    if (!assetsStr) return [];
    return assetsStr.split('|||').filter((a) => a.trim().length > 0);
  }

  getCountdownLabel(): string {
    const now = new Date();
    const start = new Date(this.booking.startTime ?? 0);
    const diffMs = start.getTime() - now.getTime();

    if (diffMs <= 0) return 'Pågår nu';

    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `Startar om ${mins}m`;

    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours < 24) {
      return remainMins > 0 ? `Startar om ${hours}h ${remainMins}m` : `Startar om ${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return days === 1 ? 'Startar imorgon' : `Startar om ${days} dagar`;
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

  async onCancel(): Promise<void> {
    if (!this.booking.bookingId) return;

    this.isCancelling.set(true);
    try {
      await this.config.onCancel(this.booking.bookingId);
    } catch {
      this.isCancelling.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
