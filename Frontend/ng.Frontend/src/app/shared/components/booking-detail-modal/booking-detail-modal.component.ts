import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { ButtonComponent } from '../button/button.component';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export interface BookingDetailModalConfig {
  booking: BookingDetailedReadModel;
  onCancel?: (bookingId: number) => Promise<void>;
  /** Cancel with scope for recurring bookings */
  onCancelWithScope?: (bookingId: number, scope: 'single' | 'thisAndFollowing' | 'all') => Promise<void>;
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
    <div class="booking-modal">
      <!-- Header Section -->
      <header class="modal-header">
        <div class="header-top">
          <h3 class="room-name">{{ booking.roomName ?? 'Okänt rum' }}</h3>
          @if (booking.status !== BookingStatus.Active) {
            <span class="status-badge" [attr.data-status]="booking.status">
              {{ statusLabel(booking.status) }}
            </span>
          }
        </div>
        
        <div class="room-meta">
          <span class="meta-item">{{ booking.roomType }}</span>
          @if (booking.roomFloor) {
            <span class="meta-dot"></span>
            <span class="meta-item">Våning {{ booking.roomFloor }}</span>
          }
          @if (booking.roomCapacity) {
            <span class="meta-dot"></span>
            <span class="meta-item">{{ booking.roomCapacity }} platser</span>
          }
          @if (booking.campusCity) {
            <span class="meta-dot"></span>
            <span class="meta-item">{{ booking.campusCity }}</span>
          }
        </div>

        @if (assets.length || classNames.length) {
          <div class="header-tags">
            @for (asset of assets; track asset) {
              <span class="tag tag--asset">{{ asset }}</span>
            }
            @for (cls of classNames; track cls) {
              <span class="tag tag--class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {{ cls }}
              </span>
            }
          </div>
        }
      </header>

      <!-- Main Content -->
      <main class="modal-body">
        <!-- Date & Time Section -->
        <section class="info-group">
          <div class="info-row">
            <div class="info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div class="info-content">
              <label>Tid och datum</label>
              <div class="value-primary">
                {{ booking.startTime | date: 'EEEE d MMMM' : '' : 'sv' }}
              </div>
              <div class="time-cluster">
                <span class="value-secondary">
                  {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
                </span>
                @if (booking.status === BookingStatus.Active) {
                  <span class="value-countdown">
                    <span class="meta-dot"></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {{ getCountdownLabel() }}
                  </span>
                }
              </div>
            </div>
          </div>

          @if (booking.recurringGroupId) {
            <div class="info-row info-row--sub">
              <div class="info-icon info-icon--brand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </div>
              <div class="info-content">
                <div class="value-brand">Återkommande serie</div>
              </div>
            </div>
          }
        </section>

        <!-- Organizer Section -->
        @if (booking.userName) {
          <section class="info-group">
            <div class="info-row">
              <div class="info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div class="info-content">
                <label>Bokat av</label>
                <div class="value-primary">{{ booking.userName }}</div>
                @if (booking.userEmail) {
                  <div class="value-secondary">{{ booking.userEmail }}</div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Registration & Status Section -->
        @if (hasRegistration) {
          <section class="info-group">
            <div class="info-row">
              <div class="info-icon" [class.info-icon--success]="!isDeclined() && !config.isInvitation" 
                                   [class.info-icon--danger]="isDeclined()"
                                   [class.info-icon--brand]="config.isInvitation">
                @if (config.isInvitation) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                } @else if (isDeclined()) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                }
              </div>
              <div class="info-content">
                <label>Deltagande</label>
                <div class="value-primary" [class.text--success]="!isDeclined() && !config.isInvitation"
                                           [class.text--danger]="isDeclined()"
                                           [class.text--brand]="config.isInvitation">
                  @if (config.isInvitation) { Inbjudan väntar }
                  @else if (isDeclined()) { Du har avböjt }
                  @else { Du deltar }
                </div>
                <div class="value-secondary">{{ registrationCountLabel() }}</div>
              </div>
            </div>
          </section>
        }

        <!-- Notes Section -->
        @if (booking.notes) {
          <section class="info-group info-group--notes">
            <label class="notes-label">Anteckningar</label>
            <div class="notes-box">
              {{ booking.notes }}
            </div>
          </section>
        }
      </main>

      <!-- Action Footer -->
      <footer class="modal-footer">
        <div class="footer-left">
          <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>
        </div>
        
        <div class="footer-actions">
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
            @if (booking.recurringGroupId && config.onCancelWithScope && !showSeriesCancelOptions()) {
              <app-button variant="danger" (clicked)="showSeriesCancelOptions.set(true)">
                Avboka…
              </app-button>
            } @else if (booking.recurringGroupId && config.onCancelWithScope && showSeriesCancelOptions()) {
              <div class="series-actions">
                <app-button variant="danger" [disabled]="isCancelling()" (clicked)="onCancelScope('single')">
                  {{ isCancelling() ? '...' : 'Denna' }}
                </app-button>
                <app-button variant="danger" [disabled]="isCancelling()" (clicked)="onCancelScope('thisAndFollowing')">
                  {{ isCancelling() ? '...' : 'Följande' }}
                </app-button>
                <app-button variant="danger" [disabled]="isCancelling()" (clicked)="onCancelScope('all')">
                  {{ isCancelling() ? '...' : 'Hela serien' }}
                </app-button>
              </div>
            } @else {
              <app-button variant="danger" [disabled]="isCancelling()" (clicked)="onCancel()">
                {{ isCancelling() ? 'Avbokar...' : 'Avboka' }}
              </app-button>
            }
          }
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      @use 'styles/mixins' as *;

      .booking-modal {
        display: flex;
        flex-direction: column;
        color: var(--color-text-primary);
        font-family: var(--font-family);
      }

      /* -- Header -- */
      .modal-header {
        padding-bottom: 24px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: 12px;
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

      .room-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .meta-item {
        font-size: var(--font-sm);
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .meta-dot {
        width: 3px;
        height: 3px;
        background: var(--color-divider);
        border-radius: 50%;
      }

      .status-badge {
        flex-shrink: 0;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;

        &[data-status='Active'] {
          background: var(--badge-green-bg);
          color: var(--badge-green-text);
        }
        &[data-status='Cancelled'] {
          background: var(--color-danger-surface);
          color: var(--color-danger);
        }
        &[data-status='Expired'] {
          background: var(--badge-gray-bg);
          color: var(--badge-gray-text);
        }
      }

      .header-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;

        &--asset {
          background: var(--color-asset-bg);
          color: var(--color-asset-text);
          border: 1px solid var(--color-asset-border);
        }

        &--class {
          background: var(--color-primary-surface);
          color: var(--color-primary);
          
          svg {
            width: 12px;
            height: 12px;
          }
        }
      }

      /* -- Body & Info Groups -- */
      .modal-body {
        padding: 24px 0;
        @include stack(24px);
      }

      .info-group {
        @include stack(12px);

        &--notes {
          padding: 16px;
          background: var(--color-bg-panel);
          border-radius: 12px;
          border: 1px solid var(--color-border);
        }
      }

      .info-row {
        display: flex;
        gap: 16px;

        &--sub {
          margin-left: 36px;
          margin-top: -8px;
        }
      }

      .info-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 2px;
        color: var(--color-text-muted);

        svg {
          width: 20px;
          height: 20px;
        }

        &--success { color: var(--color-success); }
        &--danger { color: var(--color-danger); }
        &--brand { color: var(--color-primary); }
      }

      .info-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;

        label {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
          margin-bottom: 6px;
        }
      }

      .time-cluster {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .value-countdown {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-primary);
        font-size: 0.8125rem;
        font-weight: 700;

        .meta-dot {
          background: var(--color-divider);
          opacity: 0.6;
        }

        svg {
          width: 12px;
          height: 12px;
        }
      }

      .value-primary {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--color-text-primary);
        margin-bottom: 2px;

        &::first-letter { text-transform: uppercase; }
      }

      .value-secondary {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .value-brand {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--color-primary);
      }

      .notes-label {
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--color-text-muted);
      }

      .notes-box {
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--color-text-primary);
        white-space: pre-wrap;
      }

      .text--success { color: var(--color-success); }
      .text--danger { color: var(--color-danger); }
      .text--brand { color: var(--color-primary); }

      /* -- Footer -- */
      .modal-footer {
        padding-top: 24px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      .footer-actions {
        display: flex;
        gap: 12px;
      }

      .series-actions {
        display: flex;
        gap: 8px;
      }

      @include breakpoint-down('sm') {
        .modal-footer {
          flex-direction: column-reverse;
          align-items: stretch;
        }
        .footer-left, .footer-actions, .series-actions {
          display: flex;
          flex-direction: column;
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
  protected assets = this.config.booking.roomAssets ?? [];
  protected classNames = this.config.booking.classNames ?? [];

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
  readonly showSeriesCancelOptions = signal(false);

  /** Reactive label for participant count */
  registrationCountLabel = computed(() => {
    const count = this.registrationCount();
    if (count === 0) return 'Inga registrerade ännu';
    return `${count} registrerad${count !== 1 ? 'e' : ''}`;
  });

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
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '';
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

  async onCancelScope(scope: 'single' | 'thisAndFollowing' | 'all'): Promise<void> {
    if (!this.booking.bookingId || !this.config.onCancelWithScope) return;

    this.isCancelling.set(true);
    try {
      await this.config.onCancelWithScope(this.booking.bookingId, scope);
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
