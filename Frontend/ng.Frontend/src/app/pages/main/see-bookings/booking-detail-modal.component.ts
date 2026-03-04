import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export interface BookingDetailModalConfig {
  booking: BookingDetailedReadModel;
  onCancel?: (bookingId: number) => Promise<void>;
  /** Whether the current user is registered for this booking */
  isRegistered?: boolean;
  /** Whether the current user has declined this invitation */
  isDeclined?: boolean;
  /** Whether this is a pending invitation (status = invited) */
  isInvitation?: boolean;
  /** Called when user registers / accepts invitation for this booking */
  onRegister?: (bookingId: number) => Promise<void>;
  /** Called when user unregisters from this booking */
  onUnregister?: (bookingId: number) => Promise<void>;
  /** Called when user declines an invitation */
  onDecline?: (bookingId: number) => Promise<void>;
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
          @if (booking.status === BookingStatus.Active) {
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

        <!-- Registration row — show participant count for attended bookings -->
        @if (hasRegistration) {
          <div class="detail-row">
            @if (config.isInvitation) {
              <div class="detail-icon detail-icon--invitation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-primary detail-primary--invitation">Du är inbjuden</span>
                <span class="detail-secondary">
                  {{ registrationCountLabel() }}
                </span>
              </div>
            } @else if (isDeclined()) {
              <div class="detail-icon detail-icon--declined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-primary detail-primary--declined">Du avböjde</span>
                <span class="detail-secondary">
                  {{ registrationCountLabel() }}
                </span>
              </div>
            } @else {
              <div class="detail-icon detail-icon--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-primary detail-primary--success">Du deltar</span>
                <span class="detail-secondary">
                  {{ registrationCountLabel() }}
                </span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>
        @if (config.isInvitation && config.onRegister && config.onDecline) {
          <app-button variant="danger" [disabled]="isRegistering()" (clicked)="onDecline()">
            {{ isRegistering() ? 'Avböjer...' : 'Avböj' }}
          </app-button>
          <app-button variant="primary" [disabled]="isRegistering()" (clicked)="onRegister()">
            {{ isRegistering() ? 'Accepterar...' : 'Acceptera' }}
          </app-button>
        } @else if (config.onRegister && isDeclined()) {
          <app-button variant="primary" [disabled]="isRegistering()" (clicked)="onRegister()">
            {{ isRegistering() ? 'Accepterar...' : 'Acceptera inbjudan' }}
          </app-button>
        } @else if (config.onUnregister && isRegistered()) {
          <app-button variant="danger" [disabled]="isRegistering()" (clicked)="onUnregister()">
            {{ isRegistering() ? 'Avregistrerar...' : 'Avregistrera' }}
          </app-button>
        } @else if (config.onCancel && booking.status === BookingStatus.Active && !isDeclined()) {
          <app-button variant="danger" [disabled]="isCancelling()" (clicked)="onCancel()">
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

      /* ── Registration integrated into detail rows ── */
      .detail-icon--success {
        background: var(--color-success-surface, #dcfce7);

        svg {
          stroke: var(--color-success, #16a34a);
        }
      }

      .detail-primary--success {
        color: var(--color-success, #16a34a);
      }

      .detail-icon--declined {
        background: var(--color-danger-surface, #fef2f2);

        svg {
          stroke: var(--color-danger, #dc2626);
        }
      }

      .detail-primary--declined {
        color: var(--color-text-muted);
      }

      .detail-action {
        margin-left: auto;
        flex-shrink: 0;
      }

      .inline-btn {
        display: inline-flex;
        align-items: center;
        padding: 5px 14px;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &--register {
          background: var(--color-primary);
          color: white;

          &:hover:not(:disabled) {
            background: var(--color-primary-hover);
            box-shadow: var(--shadow-sm);
          }
        }

        &--unregister {
          background: transparent;
          color: var(--color-text-muted);
          border-color: var(--color-border);

          &:hover:not(:disabled) {
            color: var(--color-danger, #dc2626);
            border-color: var(--color-danger, #dc2626);
            background: var(--color-danger-surface, #fde2e2);
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailModalComponent {
  protected readonly BookingStatus = BookingStatus;
  private readonly modalService = inject(ModalService);

  protected config: BookingDetailModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;
  protected assets = this.parseAssets(this.config.booking.roomAssets);

  /** Whether to show the registration row at all */
  protected hasRegistration = !!(
    this.config.onRegister ||
    this.config.onUnregister ||
    this.config.isRegistered ||
    this.config.isDeclined ||
    this.config.isInvitation
  );

  readonly isCancelling = signal(false);
  readonly isRegistering = signal(false);
  readonly isRegistered = signal(this.config.isRegistered ?? false);
  readonly isDeclined = signal(this.config.isDeclined ?? false);
  readonly registrationCount = signal(this.config.booking.registrationCount ?? 0);

  /** Reactive label for participant count */
  registrationCountLabel = computed(() => {
    const count = this.registrationCount();
    if (count === 0) return 'Inga registrerade ännu';
    return `${count} registrerad${count !== 1 ? 'e' : ''}`;
  });

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
    if (!this.booking.bookingId || !this.config.onCancel) return;

    this.isCancelling.set(true);
    try {
      await this.config.onCancel(this.booking.bookingId);
    } catch {
      this.isCancelling.set(false);
    }
  }

  async onRegister(): Promise<void> {
    if (!this.booking.bookingId || !this.config.onRegister) return;

    this.isRegistering.set(true);
    try {
      await this.config.onRegister(this.booking.bookingId);
      this.isRegistered.set(true);
      this.isDeclined.set(false);
      this.registrationCount.update((c) => c + 1);
    } catch {
      // keep current state
    } finally {
      this.isRegistering.set(false);
    }
  }

  async onUnregister(): Promise<void> {
    if (!this.booking.bookingId || !this.config.onUnregister) return;

    this.isRegistering.set(true);
    try {
      await this.config.onUnregister(this.booking.bookingId);
      this.isRegistered.set(false);
      this.registrationCount.update((c) => Math.max(0, c - 1));
    } catch {
      // keep current state
    } finally {
      this.isRegistering.set(false);
    }
  }

  async onDecline(): Promise<void> {
    if (!this.booking.bookingId || !this.config.onDecline) return;

    this.isRegistering.set(true);
    try {
      await this.config.onDecline(this.booking.bookingId);
    } catch {
      // keep current state
    } finally {
      this.isRegistering.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
