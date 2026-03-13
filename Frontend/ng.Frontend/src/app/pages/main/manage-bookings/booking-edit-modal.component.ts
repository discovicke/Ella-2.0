import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ModalService } from '../../../shared/services/modal.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { BookingService } from '../../../shared/services/booking.service';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import {
  RegistrationService,
  RegistrationParticipant,
} from '../../../shared/services/registration.service';

export interface BookingEditModalConfig {
  booking: BookingDetailedReadModel;
  onStatusChange: (bookingId: number, newStatus: BookingStatus) => Promise<void>;
  onCancelWithScope?: (bookingId: number, scope: 'single' | 'thisAndFollowing' | 'all') => Promise<void>;
  /** Called after booking details (times/notes) are successfully saved. */
  onDetailsUpdated?: () => void;
}

@Component({
  selector: 'app-booking-edit-modal',
  imports: [DatePipe, ButtonComponent, BadgeComponent, FormsModule],
  template: `
    <div class="booking-modal">
      <!-- Hero: Room + Status -->
      <div class="modal-hero-banner" [attr.data-status]="booking.status">
        <div class="hero-top">
          <div class="room-icon-badge">
            @switch (getRoomIconType(booking.roomType)) {
              @case ('lab') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 2v8L4.5 20.29A2 2 0 0 0 6 23h12a2 2 0 0 0 1.5-2.71L14 10V2z" />
                  <path d="M8.5 2h7" />
                </svg>
              }
              @case ('classroom') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              }
              @case ('meeting') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
              }
              @case ('computer') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            }
          </div>
          <app-badge [variant]="getStatusVariant(booking.status)">
            {{ statusLabel(booking.status) }}
          </app-badge>
        </div>
        
        <h3 class="hero-room">{{ booking.roomName ?? 'Okänt rum' }}</h3>
        
        <div class="hero-meta">
          <span class="hero-detail">{{ booking.roomType ?? 'Rum' }}</span>
          @if (booking.roomFloor) {
            <span class="meta-sep"></span>
            <span class="hero-detail">Våning {{ booking.roomFloor }}</span>
          }
          @if (booking.roomCapacity) {
            <span class="meta-sep"></span>
            <span class="hero-detail">{{ booking.roomCapacity }} platser</span>
          }
          @if (booking.campusCity) {
            <span class="meta-sep"></span>
            <span class="hero-detail">{{ booking.campusCity }}</span>
          }
        </div>

        @if (booking.roomAssets?.length) {
          <div class="hero-assets">
            @for (asset of booking.roomAssets!; track asset) {
              <app-badge variant="asset">{{ asset }}</app-badge>
            }
          </div>
        }
      </div>

      <div class="modal-content-body">
        <!-- Section: Time -->
        <div class="info-card">
          <div class="info-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="info-card-content">
            <div class="info-label">Tid & Datum</div>
            <div class="info-card-value">
              {{ booking.startTime | date: 'EEEE d MMMM yyyy' : '' : 'sv' }}
            </div>
            <div class="info-card-sub">
              {{ booking.startTime | date: 'HH:mm' }} – {{ booking.endTime | date: 'HH:mm' }}
              @if (booking.recurringGroupId) {
                <span class="recurring-inline-badge" title="Återkommande bokning">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  Serie
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Section: Booker (Elevated Context) -->
        <div class="info-card booker-card">
          <div class="info-card-icon booker-avatar">
            {{ (booking.userName || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="info-card-content">
            <div class="info-label">Bokare</div>
            <div class="info-card-value">{{ booking.userName ?? '—' }}</div>
            <div class="info-card-sub">
              <a [href]="'mailto:' + booking.userEmail" class="email-link">
                {{ booking.userEmail ?? '' }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </a>
            </div>
            @if (booking.bookerName) {
              <div class="form-source-badge">
                Via: {{ booking.bookerName }}
              </div>
            }
          </div>
        </div>

        <!-- Section: Participants & Notes -->
        <div class="details-grid">
          @if (booking.registrationCount) {
            <div class="info-card info-card--compact clickable" (click)="toggleParticipants()">
              <div class="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
              </div>
              <div class="info-card-content">
                <div class="info-label">Deltagare</div>
                <div class="info-card-value">{{ booking.registrationCount }} st</div>
              </div>
              <div class="expand-arrow" [class.expanded]="showParticipants()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          }

          <div class="info-card info-card--compact">
            <div class="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div class="info-card-content">
              <div class="info-label">Anteckning</div>
              <div class="info-card-value info-card-value--notes">{{ booking.notes || '—' }}</div>
            </div>
          </div>
        </div>

        @if (showParticipants()) {
          <div class="participants-expanded-list">
            @if (isLoadingParticipants()) {
              <div class="p-loading">Laddar deltagare...</div>
            } @else {
              @for (p of participants(); track p.userId) {
                <div class="p-row">
                  <div class="p-avatar">{{ p.displayName.charAt(0).toUpperCase() }}</div>
                  <div class="p-info">
                    <span class="p-name">{{ p.displayName || '—' }}</span>
                    <span class="p-email">{{ p.email }}</span>
                  </div>
                </div>
              } @empty {
                <div class="p-empty">Inga registrerade deltagare.</div>
              }
            }
          </div>
        }

        @if (isEditing()) {
          <div class="edit-elevated-card">
            <div class="edit-header">Redigera bokning</div>
            <div class="edit-grid">
              <div class="edit-field">
                <label>Starttid</label>
                <input type="datetime-local" [(ngModel)]="editStartTime" />
              </div>
              <div class="edit-field">
                <label>Sluttid</label>
                <input type="datetime-local" [(ngModel)]="editEndTime" />
              </div>
              <div class="edit-field full-width">
                <label>Anteckning</label>
                <textarea rows="2" [(ngModel)]="editNotes" placeholder="Valfri anteckning..."></textarea>
              </div>
            </div>
            <div class="edit-footer">
              <app-button variant="tertiary" size="sm" (clicked)="isEditing.set(false)">Avbryt</app-button>
              <app-button variant="primary" size="sm" [disabled]="isSaving()" (clicked)="onSaveDetails()">
                {{ isSaving() ? 'Sparar...' : 'Spara ändringar' }}
              </app-button>
            </div>
          </div>
        }
      </div>

      <!-- Footer: Meta + Actions -->
      <div class="modal-footer modal-footer--between">
        <div class="timestamps">
          <span>Skapad: {{ booking.createdAt | date: 'yyyy-MM-dd HH:mm' }}</span>
          @if (booking.updatedAt) {
            <span>Ändrad: {{ booking.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
          }
        </div>
        
        <div class="action-bar">
          <app-button variant="tertiary" (clicked)="onClose()">Stäng</app-button>

          <div class="primary-actions">
            @if (booking.status === BookingStatus.Active && !hasEnded() && !isEditing()) {
              <app-button variant="secondary" (clicked)="startEditing()">Redigera</app-button>
            }

            @if (booking.status === BookingStatus.Cancelled && !hasEnded()) {
              <app-button variant="primary" [disabled]="isSubmitting()" (clicked)="onSetStatus(BookingStatus.Active)">
                {{ isSubmitting() ? '...' : 'Aktivera' }}
              </app-button>
            }

            @if (booking.status === BookingStatus.Active) {
              @if (booking.recurringGroupId && !showSeriesCancelOptions()) {
                <app-button variant="danger" (clicked)="showSeriesCancelOptions.set(true)">Avboka...</app-button>
              } @else if (booking.recurringGroupId && showSeriesCancelOptions()) {
                <div class="recurrence-action-group">
                  <button class="recur-btn" (click)="onCancelScope('single')">Endast denna</button>
                  <button class="recur-btn" (click)="onCancelScope('thisAndFollowing')">Denna & kommande</button>
                  <button class="recur-btn recur-btn--danger" (click)="onCancelScope('all')">Hela serien</button>
                </div>
              } @else {
                <app-button variant="danger" [disabled]="isSubmitting()" (clicked)="onSetStatus(BookingStatus.Cancelled)">
                  {{ isSubmitting() ? '...' : 'Avboka' }}
                </app-button>
              }
            }

            @if (booking.status === BookingStatus.Pending) {
              <app-button variant="primary" [disabled]="isSubmitting()" (clicked)="onSetStatus(BookingStatus.Active)">
                {{ isSubmitting() ? '...' : 'Godkänn' }}
              </app-button>
              <app-button variant="danger" [disabled]="isSubmitting()" (clicked)="onSetStatus(BookingStatus.Cancelled)">
                {{ isSubmitting() ? '...' : 'Neka' }}
              </app-button>
            }
          </div>
        </div>
      </div>
    </div>

  `,
  styles: [
    `
      @use 'styles/mixins' as *;
      @use 'sass:map';

      .booking-modal {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .room-icon-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        border-radius: 10px;
        border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);

        svg {
          width: 22px;
          height: 22px;
        }
      }

      .hero-room {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--color-text-primary);
        line-height: 1.2;
        letter-spacing: -0.02em;
      }

      .hero-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
      }

      .hero-detail {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--color-text-muted);
      }

      .meta-sep {
        display: inline-flex;
        align-items: center;
        &::before {
          content: '|';
          margin: 0 10px;
          color: var(--color-border);
          opacity: 0.6;
          font-weight: 400;
        }
      }

      .hero-assets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }

      .info-card.clickable {
        cursor: pointer;
        &:hover {
          border-color: var(--color-primary);
          background: var(--color-bg-card);
        }
      }

      .info-card-value--notes {
        font-weight: 500;
        font-style: italic;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .info-card-sub {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ── Booker Section ── */
      .booker-card {
        background: color-mix(in srgb, var(--color-primary-surface) 40%, var(--color-bg-panel));
        border-color: color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
      }

      .booker-avatar {
        background: var(--color-primary);
        color: white;
        font-weight: 800;
        font-size: 0.9rem;
      }

      .email-link {
        color: var(--color-primary);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        &:hover { text-decoration: underline; }
      }

      .form-source-badge {
        display: inline-flex;
        margin-top: 4px;
        padding: 2px 8px;
        background: var(--color-bg-card);
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        color: #b45309;
      }

      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 12px;
        @media (max-width: 480px) { grid-template-columns: 1fr; }
      }

      .recurring-inline-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 6px;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .expand-arrow, .expand-icon {
        margin-left: auto;
        color: var(--color-text-muted);
        transition: transform 0.2s ease;
        &.expanded { transform: rotate(180deg); }
        svg { width: 18px; height: 18px; }
      }

      /* ── Participants ── */
      .participants-expanded-list {
        background: var(--color-bg-panel);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        max-height: 200px;
        overflow-y: auto;
        margin-top: -4px;
      }

      .p-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        &:not(:last-child) { border-bottom: 1px solid var(--color-border); }
      }

      .p-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--color-primary-surface);
        color: var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .p-info {
        display: flex;
        flex-direction: column;
        .p-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text-primary); }
        .p-email { font-size: 0.75rem; color: var(--color-text-muted); }
      }

      /* ── Edit Card ── */
      .edit-elevated-card {
        margin-top: 8px;
        background: var(--color-bg-card);
        border: 2px solid var(--color-primary);
        border-radius: 14px;
        padding: 16px;
        box-shadow: var(--shadow-lg);
        animation: slideUp 0.2s ease;
      }

      @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      .edit-header {
        font-size: 0.85rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--color-primary);
        margin-bottom: 12px;
      }

      .edit-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .edit-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        &.full-width { grid-column: span 2; }
        label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); }
        input, textarea {
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 0.85rem;
          background: var(--color-bg-panel);
          color: var(--color-text-primary);
          font-family: inherit;
          &:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-surface); }
        }
      }

      .edit-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }

      /* ── Footer ── */
      .timestamps {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.7rem;
        color: var(--color-text-muted);
        opacity: 0.8;
      }

      .action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .primary-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }

      .recurrence-action-group {
        display: flex;
        gap: 4px;
        background: var(--color-bg-panel);
        padding: 4px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }

      .recur-btn {
        padding: 6px 10px;
        font-size: 0.75rem;
        font-weight: 700;
        border: none;
        background: transparent;
        color: var(--color-text-secondary);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        &:hover { background: var(--color-bg-card); color: var(--color-text-primary); }
        &--danger:hover { background: var(--color-danger-surface); color: var(--color-danger); }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingEditModalComponent {
  protected readonly BookingStatus = BookingStatus;
  private readonly modalService = inject(ModalService);
  private readonly registrationService = inject(RegistrationService);
  private readonly bookingService = inject(BookingService);

  private config: BookingEditModalConfig = this.modalService.modalData();
  protected booking = this.config.booking;

  readonly isSubmitting = signal(false);
  readonly showParticipants = signal(false);
  readonly isLoadingParticipants = signal(false);
  readonly participants = signal<RegistrationParticipant[]>([]);
  readonly showSeriesCancelOptions = signal(false);

  getRoomIconType(typeName: string | null | undefined): string {
    if (!typeName) return 'room';
    const lower = typeName.toLowerCase();
    if (lower.includes('labb') || lower.includes('lab')) return 'lab';
    if (lower.includes('klassrum') || lower.includes('klass') || lower.includes('sal')) return 'classroom';
    if (lower.includes('konferens') || lower.includes('möte') || lower.includes('grupprum')) return 'meeting';
    if (lower.includes('dator') || lower.includes('it')) return 'computer';
    return 'room';
  }

  // ── Edit mode ──────────────────────────────────────
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  editStartTime = '';
  editEndTime = '';
  editNotes = '';

  private toLocalDatetimeInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toLocalIsoString(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  startEditing(): void {
    this.editStartTime = this.toLocalDatetimeInput(this.booking.startTime);
    this.editEndTime = this.toLocalDatetimeInput(this.booking.endTime);
    this.editNotes = this.booking.notes ?? '';
    this.isEditing.set(true);
  }

  async onSaveDetails(): Promise<void> {
    if (!this.booking.bookingId) return;

    const start = new Date(this.editStartTime);
    const end = new Date(this.editEndTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return; // silent guard — inputs are type=datetime-local so this is rare
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.bookingService.updateBookingDetails(this.booking.bookingId, {
          startTime: this.toLocalIsoString(start),
          endTime: this.toLocalIsoString(end),
          notes: this.editNotes,
        })
      );
      // Patch local booking reference so the view reflects changes immediately
      this.booking = {
        ...this.booking,
        startTime: this.toLocalIsoString(start),
        endTime: this.toLocalIsoString(end),
        notes: this.editNotes,
      };
      this.isEditing.set(false);
      this.config.onDetailsUpdated?.();
    } catch {
      // leave edit mode open so user can retry
    } finally {
      this.isSaving.set(false);
    }
  }

  statusLabel(status?: BookingStatus): string {
    switch (status) {
      case BookingStatus.Active:
        return 'Aktiv';
      case BookingStatus.Pending:
        return 'V\u00e4ntande';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '—';
    }
  }

  getStatusVariant(status?: BookingStatus): any {
    switch (status) {
      case BookingStatus.Active:
        return 'success';
      case BookingStatus.Pending:
        return 'warning';
      case BookingStatus.Cancelled:
        return 'danger';
      case BookingStatus.Expired:
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  hasEnded(): boolean {
    const end = new Date(this.booking.endTime ?? 0);
    return end < new Date();
  }

  async toggleParticipants(): Promise<void> {
    const next = !this.showParticipants();
    this.showParticipants.set(next);

    if (next && this.participants().length === 0 && this.booking.bookingId) {
      this.isLoadingParticipants.set(true);
      try {
        const list = await firstValueFrom(
          this.registrationService.getParticipants(this.booking.bookingId),
        );
        this.participants.set(list);
      } catch {
        this.participants.set([]);
      } finally {
        this.isLoadingParticipants.set(false);
      }
    }
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

  async onCancelScope(scope: 'single' | 'thisAndFollowing' | 'all'): Promise<void> {
    if (!this.booking.bookingId || !this.config.onCancelWithScope) return;

    this.isSubmitting.set(true);
    try {
      await this.config.onCancelWithScope(this.booking.bookingId, scope);
    } catch {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalService.close();
  }
}
