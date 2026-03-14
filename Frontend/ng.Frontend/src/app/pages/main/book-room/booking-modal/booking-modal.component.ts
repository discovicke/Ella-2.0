import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookingService } from '../../../../shared/services/booking.service';
import { ModalService } from '../../../../shared/services/modal.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SessionService } from '../../../../core/session.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ClassService } from '../../../../shared/services/class.service';
import { RegistrationService } from '../../../../shared/services/registration.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { SelectablePillComponent } from '../../../../shared/components/selectable-pill/selectable-pill.component';
import { TimePickerComponent } from '../../../../shared/components/time-picker/time-picker.component';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import {
  CreateBookingDto,
  BookingStatus,
  RoomDetailModel,
  ClassResponseDto,
  BookingConflictResponse,
  ConflictDetail,
} from '../../../../models/models';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

interface UserSearchResult {
  userId: number;
  displayName: string;
  email: string;
}

/** Extended modal data shape — includes optional calendar prefill times and post-create callback. */
interface BookingModalData extends RoomDetailModel {
  prefillStart?: Date;
  prefillEnd?: Date;
  /** Called after a booking is successfully created so callers can refresh their data. */
  onBookingCreated?: () => void;
}

@Component({
  selector: 'app-booking-modal',
  imports: [ReactiveFormsModule, ButtonComponent, BadgeComponent, SelectablePillComponent, TimePickerComponent, DatePickerComponent, SelectComponent],
  templateUrl: './booking-modal.component.html',
  styleUrl: './booking-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingModalComponent implements OnInit, OnDestroy {
  private readonly bookingService = inject(BookingService);
  protected readonly modalService = inject(ModalService);
  private readonly confirmService = inject(ConfirmService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);
  private readonly classService = inject(ClassService);
  private readonly registrationService = inject(RegistrationService);

  // Get the room (and optional prefill times) from modal data
  readonly room = this.modalService.modalData() as BookingModalData;

  // ─── Permission check ─────────────────────────────
  readonly canManageClasses = this.sessionService.hasPermission('bookRoom');

  // ─── User search state ────────────────────────────
  readonly searchQuery = signal('');
  readonly searchResults = signal<UserSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly selectedUsers = signal<UserSearchResult[]>([]);
  readonly showSearchResults = signal(false);
  readonly noSearchResults = signal(false);
  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // ─── Class picker state ───────────────────────────
  readonly classes = signal<ClassResponseDto[]>([]);
  readonly selectedClassIds = signal<Set<number>>(new Set());
  readonly classMembers = signal<UserSearchResult[]>([]);
  readonly isLoadingMembers = signal(false);
  readonly showClassPicker = signal(false);

  getRoomIconType(typeName: string | null | undefined): string {
    if (!typeName) return 'room';
    const lower = typeName.toLowerCase();
    if (lower.includes('labb') || lower.includes('lab')) return 'lab';
    if (lower.includes('klassrum') || lower.includes('klass') || lower.includes('sal')) return 'classroom';
    if (lower.includes('konferens') || lower.includes('möte') || lower.includes('grupprum')) return 'meeting';
    if (lower.includes('dator') || lower.includes('it')) return 'computer';
    return 'room';
  }

  readonly recurrenceOptions: SelectOption[] = [
    { id: 'daily', label: 'Varje dag' },
    { id: 'weekly', label: 'Varje vecka' },
    { id: 'biweekly', label: 'Varannan vecka' },
    { id: 'monthly', label: 'Varje månad' },
  ];

  ngOnInit(): void {
    // Only load classes if the user has ManageClasses
    if (this.canManageClasses) {
      this.classService.getAll().subscribe({
        next: (classes) => this.classes.set(classes),
      });
    }

    // Wire up debounced user search
    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.length < 2) {
            this.searchResults.set([]);
            this.showSearchResults.set(false);
            this.noSearchResults.set(false);
            return of([]);
          }
          this.isSearching.set(true);
          return this.registrationService.searchUsers(q);
        }),
      )
      .subscribe({
        next: (results) => {
          // Filter out already-selected users
          const selectedIds = new Set(this.selectedUsers().map((u) => u.userId));
          this.searchResults.set(results.filter((r) => !selectedIds.has(r.userId)));
          this.showSearchResults.set(this.searchResults().length > 0);
          this.noSearchResults.set(
            this.searchResults().length === 0 && this.searchQuery().length >= 2,
          );
          this.isSearching.set(false);
        },
        error: () => this.isSearching.set(false),
      });

    // Pre-fill form from calendar time-range selection (if available)
    if (this.room.prefillStart && this.room.prefillEnd) {
      const start = new Date(this.room.prefillStart);
      const end = new Date(this.room.prefillEnd);
      this.bookingForm.patchValue({
        startDate: this.formatDate(start),
        startTime: this.formatTime(start),
        endDate: this.formatDate(end),
        endTime: this.formatTime(end),
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  // ─── User search methods ──────────────────────────
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  selectUser(user: UserSearchResult): void {
    this.selectedUsers.update((list) => [...list, user]);
    this.searchResults.update((list) => list.filter((r) => r.userId !== user.userId));
    this.searchQuery.set('');
    this.showSearchResults.set(false);
    this.noSearchResults.set(false);
  }

  removeUser(userId: number): void {
    this.selectedUsers.update((list) => list.filter((u) => u.userId !== userId));
  }

  hideSearchResults(): void {
    // Small delay so click on result registers before hiding
    setTimeout(() => {
      this.showSearchResults.set(false);
      this.noSearchResults.set(false);
    }, 200);
  }

  clearSearchQuery(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
    this.showSearchResults.set(false);
    this.noSearchResults.set(false);
  }

  // ─── Class picker methods ─────────────────────────
  isClassSelected(id: number): boolean {
    return this.selectedClassIds().has(id);
  }

  toggleClass(id: number): void {
    this.selectedClassIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.loadClassMembers();
  }

  private loadClassMembers(): void {
    const ids = [...this.selectedClassIds()];
    if (ids.length === 0) {
      this.classMembers.set([]);
      return;
    }
    this.isLoadingMembers.set(true);
    this.registrationService.getClassMembers(ids).subscribe({
      next: (members) => {
        this.classMembers.set(members);
        this.isLoadingMembers.set(false);
      },
      error: () => this.isLoadingMembers.set(false),
    });
  }

  // ─── Date / time formatting helpers ────────────────
  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // Set default dates (today) - Local time
  private readonly today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  readonly bookingForm = new FormGroup({
    startDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl(this.today, { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', {
      nonNullable: true,
    }),
    isRecurring: new FormControl(false, { nonNullable: true }),
    recurrencePattern: new FormControl('weekly', { nonNullable: true }),
    recurrenceEnd: new FormControl('', { nonNullable: false }),
  });

  updateStartDate(date: string | null) {
    if (date) {
      this.bookingForm.controls.startDate.setValue(date);
      this.bookingForm.controls.endDate.setValue(date);
    }
  }

  updateStartTime(time: string | null) {
    if (time) this.bookingForm.controls.startTime.setValue(time);
  }

  updateEndTime(time: string | null) {
    if (time) this.bookingForm.controls.endTime.setValue(time);
  }

  updateEndDate(date: string | null) {
    if (date) this.bookingForm.controls.endDate.setValue(date);
  }

  updateRecurrencePattern(pattern: string | number | null) {
    if (pattern) this.bookingForm.controls.recurrencePattern.setValue(String(pattern));
  }

  updateRecurrenceEnd(date: string | null) {
    this.bookingForm.controls.recurrenceEnd.setValue(date || '');
  }

  readonly isSubmitting = signal(false);

  onSubmit(): void {
    if (this.bookingForm.invalid) return;

    const user = this.sessionService.currentUser();
    if (!user) {
      this.toastService.showError('Du måste vara inloggad för att boka.');
      return;
    }

    this.isSubmitting.set(true);

    const startDateTime = new Date(
      `${this.bookingForm.value.startDate}T${this.bookingForm.value.startTime}`,
    );
    const endDateTime = new Date(
      `${this.bookingForm.value.endDate}T${this.bookingForm.value.endTime}`,
    );

    if (endDateTime <= startDateTime) {
      this.toastService.showError('Sluttid måste vara efter starttid.');
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.bookingForm.getRawValue();
    if (formValue.isRecurring && !formValue.recurrenceEnd) {
      this.toastService.showError('Du måste välja ett slutdatum för återkommande bokningar.');
      this.isSubmitting.set(false);
      return;
    }

    if (!this.room.roomId) {
      this.toastService.showError('Ogiltigt rum.');
      this.isSubmitting.set(false);
      return;
    }

    const classIds = this.selectedClassIds().size > 0 ? [...this.selectedClassIds()] : null;
    const classMemberIds = new Set(this.classMembers().map((m) => m.userId));
    const individualUserIds = this.selectedUsers()
      .map((u) => u.userId)
      .filter((id) => !classMemberIds.has(id));

    const booking: CreateBookingDto = {
      userId: user.id,
      roomId: this.room.roomId,
      startTime: this.toLocalIsoString(startDateTime),
      endTime: this.toLocalIsoString(endDateTime),
      notes: formValue.notes || '',
      status: BookingStatus.Active,
      classIds,
      recurrencePattern: formValue.isRecurring ? formValue.recurrencePattern : null,
      recurrenceEnd: formValue.isRecurring && formValue.recurrenceEnd
        ? this.toLocalDateEndOfDayIsoString(formValue.recurrenceEnd)
        : null,
    };

    this.performBooking(booking, individualUserIds);
  }

  private performBooking(booking: CreateBookingDto, individualUserIds: number[]): void {
    this.bookingService.createBooking(booking).subscribe({
      next: (result) => {
        // If individual users were selected, invite them after booking creation
        if (individualUserIds.length > 0 && result?.id) {
          this.registrationService.inviteUsers(result.id, individualUserIds).subscribe({
            next: () => {
              this.toastService.showSuccess(`Bokning för ${this.room.name} skapad!`);
              this.room.onBookingCreated?.();
              this.modalService.close();
            },
            error: () => {
              this.toastService.showSuccess(
                `Bokning skapad, men kunde inte bjuda in alla användare.`,
              );
              this.room.onBookingCreated?.();
              this.modalService.close();
            },
          });
        } else {
          this.toastService.showSuccess(`Bokning för ${this.room.name} skapad!`);
          this.room.onBookingCreated?.();
          this.modalService.close();
        }
      },
      error: async (err) => {
        console.error('Booking error:', err);
        
        // Handle booking conflict (overwrite confirmation needed)
        if (err.status === 409 && err.error?.conflicts) {
          const confirmed = await this.handleBookingConflict(err.error);
          if (confirmed) {
            this.performBooking({ ...booking, overwriteConflicts: true }, individualUserIds);
          } else {
            this.isSubmitting.set(false);
          }
          return;
        }

        const message = err.error?.message || 'Kunde inte skapa bokning. Kontrollera tillgänglighet.';
        this.toastService.showError(message);
        this.isSubmitting.set(false);
      },
    });
  }

  private async handleBookingConflict(conflictResponse: BookingConflictResponse): Promise<boolean> {
    const conflicts = conflictResponse.conflicts;
    
    let message = 'Denna bokning kommer att överskriva följande bokningar:\n\n';
    
    conflicts.forEach(c => {
      const date = new Date(c.startTime).toLocaleDateString('sv-SE');
      const start = new Date(c.startTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(c.endTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      message += `• ${c.userName} - ${date} ${start}-${end} (nivå: ${c.userPermissionLevel})\n`;
    });
    
    message += '\nVill du fortsätta och avboka dessa?';

    return await this.confirmService.show(message, {
      title: 'Bekräfta överskrivning',
      confirmText: 'Bekräfta och överskriv',
      cancelText: 'Avbryt',
      dangerConfirm: true,
      icon: 'warning'
    });
  }

  private toLocalIsoString(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private toLocalDateEndOfDayIsoString(dateInput: string): string {
    return `${dateInput}T23:59:59`;
  }
}
