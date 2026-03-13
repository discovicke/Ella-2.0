import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { ButtonComponent } from '../button/button.component';
import { BadgeComponent } from '../badge/badge.component';
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
  imports: [DatePipe, ButtonComponent, BadgeComponent],
  template: `
    <div class="booking-modal">
      <!-- Header Section -->
      <header class="modal-hero-banner">
        <div class="header-top">
          <h3 class="room-name">{{ booking.roomName ?? 'Okänt rum' }}</h3>
          @if (booking.status !== BookingStatus.Active) {
            <app-badge [variant]="getStatusVariant(booking.status)">
              {{ statusLabel(booking.status) }}
            </app-badge>
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
              <app-badge variant="asset">{{ asset }}</app-badge>
            }
            @for (cls of classNames; track cls) {
              <app-badge variant="class">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {{ cls }}
              </app-badge>
            }
          </div>
        }
      </header>

      <!-- Main Content -->
      <main class="modal-content-body">
        <!-- Date & Time Section -->
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
              {{ booking.startTime | date: 'EEEE d MMMM' : '' : 'sv' }}
            </div>
            <div class="time-cluster">
              <span class="info-card-sub">
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
        </section>

        @if (booking.recurringGroupId) {
          <section class="info-card info-card--compact info-row--sub">
            <div class="info-card-icon info-card-icon--brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </div>
            <div class="info-card-content">
              <div class="value-brand">Återkommande serie</div>
            </div>
          </section>
        }

        <!-- Organizer Section -->
        @if (booking.userName) {
          <section class="info-card">
            <div class="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="info-card-content">
              <label>Bokat av</label>
              <div class="info-card-value">{{ booking.userName }}</div>
              @if (booking.userEmail) {
                <div class="info-card-sub">{{ booking.userEmail }}</div>
              }
            </div>
          </section>
        }

        <!-- Registration & Status Section -->
        @if (hasRegistration) {
          <section class="info-card">
            <div class="info-card-icon" [class.info-card-icon--success]="!isDeclined() && !config.isInvitation" 
                                 [class.info-card-icon--danger]="isDeclined()"
                                 [class.info-card-icon--brand]="config.isInvitation">
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
            <div class="info-card-content">
              <label>Deltagande</label>
              <div class="info-card-value" [class.text--success]="!isDeclined() && !config.isInvitation"
                                         [class.text--danger]="isDeclined()"
                                         [class.text--brand]="config.isInvitation">
                @if (config.isInvitation) { Inbjudan väntar }
                @else if (isDeclined()) { Du har avböjt }
                @else { Du deltar }
              </div>
              <div class="info-card-sub">{{ registrationCountLabel() }}</div>
            </div>
          </section>
        }

        <!-- Notes Section -->
        @if (booking.notes) {
          <section class="form-section">
            <label class="notes-label">Anteckningar</label>
            <div class="notes-box">
              {{ booking.notes }}
            </div>
          </section>
        }
      </main>

      <!-- Action Footer -->
      <footer class="modal-footer modal-footer--between">
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

      .header-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
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
        color: var(--color-primary-on-surface);
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

      .info-row--sub {
        margin-left: 2rem;
      }

      .value-brand {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--color-primary-on-surface);
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
      case BookingStatus.Active:
        return 'Aktiv';
      default:
        return '';
    }
  }

  getStatusVariant(status?: BookingStatus): any {
    switch (status) {
      case BookingStatus.Cancelled:
        return 'danger';
      case BookingStatus.Expired:
        return 'neutral';
      case BookingStatus.Active:
        return 'success';
      default:
        return 'neutral';
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
