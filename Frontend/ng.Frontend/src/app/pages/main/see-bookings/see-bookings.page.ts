import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BookingService } from '../../../shared/services/booking.service';
import { RegistrationService } from '../../../shared/services/registration.service';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SessionService } from '../../../core/session.service';
import {
  BookingDetailModalComponent,
  BookingDetailModalConfig,
} from './booking-detail-modal.component';

/** A booking enriched with ownership/source info for the merged view */
interface EnrichedBooking extends BookingDetailedReadModel {
  /** True if the current user created this booking */
  isOwned: boolean;
  /** True if the user declined this invitation */
  isDeclined: boolean;
  /** True if this is a past invitation the user never responded to */
  isExpiredInvitation: boolean;
  /** True if this is a pending invitation awaiting accept/decline */
  isInvitation: boolean;
  /** If not owned, the name of whoever invited/booked */
  inviterName?: string;
}

interface BookingGroup {
  label: string;
  key: string;
  bookings: EnrichedBooking[];
}

@Component({
  selector: 'app-see-bookings-page',
  imports: [DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './see-bookings.page.html',
  styleUrl: './see-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeeBookingsPage {
  protected readonly BookingStatus = BookingStatus;
  private readonly confirmService = inject(ConfirmService);
  private readonly bookingService = inject(BookingService);
  private readonly registrationService = inject(RegistrationService);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);
  private readonly sessionService = inject(SessionService);

  // --- STATE ---
  activeTab = signal<'upcoming' | 'history'>('upcoming');
  showCancelled = signal<boolean>(false);

  // Merged bookings (own + confirmed registrations)
  bookings = signal<EnrichedBooking[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  isLoading = signal<boolean>(false);
  private readonly PAGE_SIZE = 8;

  // Invitation action busy state
  invitationBusy = signal<Set<number>>(new Set());

  constructor() {
    // Auto-fetch when tab or showCancelled changes
    effect(() => {
      const _tab = this.activeTab();
      const _cancelled = this.showCancelled();
      untracked(() => this.loadBookings(true));
    });
  }

  // --- COMPUTED ---

  hasMore = computed(() => this.bookings().length < this.totalCount());

  /** The soonest upcoming active booking — from own OR registered bookings */
  nextBooking = computed(() => {
    if (this.activeTab() !== 'upcoming') return null;
    return (
      this.bookings().find((b) => b.status === BookingStatus.Active && !b.isInvitation) ?? null
    );
  });

  groupedBookings = computed(() => {
    const bookings = this.bookings();
    const tab = this.activeTab();

    if (tab === 'upcoming') {
      return this.groupUpcomingBookings(bookings);
    } else {
      return this.groupHistoryBookings(bookings);
    }
  });

  // --- HELPERS ---

  getCountdownLabel(booking: BookingDetailedReadModel): string {
    const now = new Date();
    const start = new Date(booking.startTime ?? 0);
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

  statusLabel(status: BookingStatus | undefined): string {
    switch (status) {
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '';
    }
  }

  private enrichBookings(
    bookings: BookingDetailedReadModel[],
    source: 'owned' | 'registered' | 'declined' | 'expired-invitation' | 'invitation',
  ): EnrichedBooking[] {
    const userId = this.sessionService.currentUser()?.id;
    return bookings.map((b) => ({
      ...b,
      isOwned: source === 'owned' || b.userId === userId,
      isDeclined: source === 'declined',
      isExpiredInvitation: source === 'expired-invitation',
      isInvitation: source === 'invitation',
      inviterName:
        source !== 'owned' && b.userId !== userId ? (b.userName ?? undefined) : undefined,
    }));
  }

  private groupUpcomingBookings(bookings: EnrichedBooking[]): BookingGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    const groups: BookingGroup[] = [
      { label: 'Idag', key: 'today', bookings: [] },
      { label: 'Imorgon', key: 'tomorrow', bookings: [] },
      { label: 'Denna vecka', key: 'this-week', bookings: [] },
      { label: 'Nästa vecka', key: 'next-week', bookings: [] },
      { label: 'Senare', key: 'later', bookings: [] },
    ];

    for (const booking of bookings) {
      const d = new Date(booking.startTime ?? 0);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const t = day.getTime();

      if (t === today.getTime()) {
        groups[0].bookings.push(booking);
      } else if (t === tomorrow.getTime()) {
        groups[1].bookings.push(booking);
      } else if (t > tomorrow.getTime() && t < endOfWeek.getTime()) {
        groups[2].bookings.push(booking);
      } else if (t >= endOfWeek.getTime() && t < endOfNextWeek.getTime()) {
        groups[3].bookings.push(booking);
      } else {
        groups[4].bookings.push(booking);
      }
    }

    return groups.filter((g) => g.bookings.length > 0);
  }

  private groupHistoryBookings(bookings: EnrichedBooking[]): BookingGroup[] {
    const groupMap = new Map<string, EnrichedBooking[]>();

    for (const booking of bookings) {
      const date = new Date(booking.startTime ?? 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, []);
      }
      groupMap.get(monthKey)!.push(booking);
    }

    const groups: BookingGroup[] = [];
    groupMap.forEach((items, key) => {
      const date = new Date(items[0].startTime ?? 0);
      const label = date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });

      groups.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        key,
        bookings: items,
      });
    });

    return groups;
  }

  // --- ACTIONS ---

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }

  toggleCancelled(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.showCancelled.set(checked);
  }

  async loadBookings(reset: boolean) {
    if (reset) {
      this.currentPage.set(1);
      this.bookings.set([]);
      this.totalCount.set(0);
    }

    this.isLoading.set(true);
    try {
      const isUpcoming = this.activeTab() === 'upcoming';
      const timeFilter = isUpcoming ? 'upcoming' : 'history';
      const userId = this.sessionService.currentUser()?.id;

      // Two parallel calls: paged own bookings + paged registration bookings
      const [ownResult, regResult] = await Promise.all([
        firstValueFrom(
          this.bookingService.getBookingsByUserId({
            page: this.currentPage(),
            pageSize: this.PAGE_SIZE,
            timeFilter: this.activeTab(),
            includeCancelled: this.showCancelled(),
          }),
        ),
        firstValueFrom(
          this.registrationService.getMyRegistrationBookings(
            ['registered', 'invited', 'declined'],
            timeFilter,
            this.currentPage(),
            this.PAGE_SIZE,
          ),
        ),
      ]);

      const ownBookings = this.enrichBookings(ownResult.items, 'owned');

      // Enrich registration bookings based on userRegistrationStatus from the server
      const regBookings = regResult.items;
      const enrichedReg = regBookings
        .filter((b) => b.userId !== userId) // exclude own bookings (already in ownBookings)
        .map((b) => {
          const status = b.userRegistrationStatus;
          const source: 'registered' | 'invitation' | 'declined' | 'expired-invitation' =
            status === 'invited'
              ? isUpcoming
                ? 'invitation'
                : 'expired-invitation'
              : status === 'declined'
                ? 'declined'
                : 'registered';
          return this.enrichBookings([b], source)[0];
        });

      // Merge and sort
      let merged: EnrichedBooking[];
      if (reset) {
        merged = [...ownBookings, ...enrichedReg];
      } else {
        merged = [...this.bookings(), ...ownBookings, ...enrichedReg];
      }

      // Sort: upcoming = ASC by start, history = DESC by start
      merged.sort((a, b) => {
        const ta = new Date(a.startTime ?? 0).getTime();
        const tb = new Date(b.startTime ?? 0).getTime();
        return isUpcoming ? ta - tb : tb - ta;
      });

      // Deduplicate by bookingId (own booking wins over registration)
      const seen = new Set<number>();
      const deduped: EnrichedBooking[] = [];
      for (const b of merged) {
        const id = b.bookingId ?? 0;
        if (id > 0 && !seen.has(id)) {
          seen.add(id);
          deduped.push(b);
        }
      }

      this.bookings.set(deduped);
      this.totalCount.set(ownResult.totalCount + regResult.totalCount);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  loadMore() {
    this.currentPage.update((p) => p + 1);
    this.loadBookings(false);
  }

  // ─── Invitation actions ─────────────────────────────

  async acceptInvitation(booking: EnrichedBooking, event: Event): Promise<void> {
    event.stopPropagation();
    const id = booking.bookingId;
    if (!id) return;

    this.invitationBusy.update((s) => new Set([...s, id]));
    try {
      await firstValueFrom(this.registrationService.register(id));
      this.toastService.showSuccess('Du är nu registrerad!');
      this.loadBookings(true);
    } catch {
      this.toastService.showError('Kunde inte acceptera. Försök igen.');
    } finally {
      this.invitationBusy.update((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async declineInvitation(booking: EnrichedBooking, event: Event): Promise<void> {
    event.stopPropagation();
    const id = booking.bookingId;
    if (!id) return;

    this.invitationBusy.update((s) => new Set([...s, id]));
    try {
      await firstValueFrom(this.registrationService.declineInvitation(id));
      this.toastService.showSuccess('Inbjudan avböjd.');
      this.loadBookings(true);
    } catch {
      this.toastService.showError('Kunde inte avböja. Försök igen.');
    } finally {
      this.invitationBusy.update((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  isInvitationBusy(bookingId: number | undefined): boolean {
    return this.invitationBusy().has(bookingId ?? 0);
  }

  // ─── Booking detail modal ─────────────────────────────

  openBookingDetail(booking: EnrichedBooking): void {
    const isHistory = this.activeTab() === 'history';

    const config: BookingDetailModalConfig = {
      booking,
    };

    // Only owned bookings get the cancel action
    if (booking.isOwned) {
      config.onCancel = async (bookingId: number) => {
        const confirmed = await this.confirmService.show('Vill du avboka bokningen?', {
          title: 'Avboka bokning',
          icon: 'warning' as const,
          confirmText: 'Avboka',
          cancelText: 'Behåll',
          dangerConfirm: true,
        });
        if (!confirmed) return;

        await firstValueFrom(this.bookingService.cancelBooking(bookingId));
        this.modalService.close();
        this.loadBookings(true);
      };
    }

    // Mark attended bookings so the modal can show "Du deltar"
    if (
      !booking.isOwned &&
      !booking.isDeclined &&
      !booking.isExpiredInvitation &&
      !booking.isInvitation
    ) {
      config.isRegistered = true;
    }

    // Mark declined bookings
    if (booking.isDeclined) {
      config.isDeclined = true;
    }

    // Upcoming attended bookings: allow unregister (declines the registration)
    if (
      !isHistory &&
      !booking.isOwned &&
      !booking.isDeclined &&
      !booking.isExpiredInvitation &&
      !booking.isInvitation
    ) {
      config.onUnregister = async (bookingId: number) => {
        await firstValueFrom(this.registrationService.declineInvitation(bookingId));
        this.toastService.showSuccess('Du har avregistrerats.');
        this.modalService.close();
        this.loadBookings(true);
      };
    }

    // Upcoming declined bookings: allow re-accept
    if (!isHistory && booking.isDeclined) {
      config.onRegister = async (bookingId: number) => {
        await firstValueFrom(this.registrationService.register(bookingId));
        this.toastService.showSuccess('Du är nu registrerad!');
        this.modalService.close();
        this.loadBookings(true);
      };
    }

    // Upcoming invitation bookings: allow accept/decline from modal
    if (!isHistory && booking.isInvitation) {
      config.isInvitation = true;
      config.onRegister = async (bookingId: number) => {
        await firstValueFrom(this.registrationService.register(bookingId));
        this.toastService.showSuccess('Du är nu registrerad!');
        this.modalService.close();
        this.loadBookings(true);
      };
      config.onDecline = async (bookingId: number) => {
        await firstValueFrom(this.registrationService.declineInvitation(bookingId));
        this.toastService.showSuccess('Inbjudan avböjd.');
        this.modalService.close();
        this.loadBookings(true);
      };
    }

    this.modalService.open(BookingDetailModalComponent, {
      title: 'Bokningsdetaljer',
      data: config,
      width: '480px',
    });
  }

  async onCancelBooking(booking: BookingDetailedReadModel, event?: Event) {
    event?.stopPropagation();
    if (!booking.bookingId) return;
    if (booking.status !== BookingStatus.Active) return;

    const confirmed = await this.confirmService.show('Vill du avboka bokningen?', {
      title: 'Avboka bokning',
      icon: 'warning' as const,
      confirmText: 'Avboka',
      cancelText: 'Behåll',
      dangerConfirm: true,
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.bookingService.cancelBooking(booking.bookingId));
      this.loadBookings(true);
    } catch (error) {
      console.error('Failed to cancel booking', error);
      this.toastService.showError('Kunde inte avboka. Försök igen.');
    }
  }
}
