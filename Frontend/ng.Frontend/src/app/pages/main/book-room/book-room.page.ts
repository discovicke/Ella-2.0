import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  resource,
  signal,
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DayPilot } from '@daypilot/daypilot-lite-angular';
import { firstValueFrom } from 'rxjs';
import { BookingDetailedReadModel, RoomDetailModel } from '../../../models/models';
import { BookingDetailModalComponent } from '../../../shared/components/booking-detail-modal/booking-detail-modal.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import {
  BookingService,
  RoomAvailabilityResult,
} from '../../../shared/services/booking.service';
import { SessionService } from '../../../core/session.service';
import { ModalService } from '../../../shared/services/modal.service';
import { RoomService } from '../../../shared/services/room.service';
import { BookingModalComponent } from './booking-modal/booking-modal.component';

import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../shared/components/multi-select/multi-select.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { SliderComponent } from '../../../shared/components/slider/slider.component';

type DiscoveryView = 'availability' | 'schedule';

interface AvailabilityCandidate {
  room: RoomDetailModel;
  conflicts: (BookingDetailedReadModel & { userPermissionLevel?: number })[];
  isAvailable: boolean;
  isOverridable: boolean;
  nextConflict?: BookingDetailedReadModel & { userPermissionLevel?: number };
  matchReasons: string[];
  matchScore: number;
}

@Component({
  selector: 'app-book-room-page',
  imports: [CalendarComponent, DatePipe, FormsModule, MultiSelectComponent, SelectComponent, DatePickerComponent, TimePickerComponent, SliderComponent],
  templateUrl: './book-room.page.html',
  styleUrl: './book-room.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookRoomPage {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private readonly sessionService = inject(SessionService);
  
  private roomQuerySubject = new Subject<string>();
  private capacitySubject = new Subject<number>();

  readonly selectedDate = signal(this.toDateInputValue(new Date()));
  readonly startTime = signal('09:00');
  readonly endTime = signal('10:00');
  readonly selectedCampus = signal('All');
  readonly selectedTypeId = signal<number | 'All'>('All');
  readonly minCapacity = signal<number>(0);
  readonly debouncedMinCapacity = signal<number>(0);
  readonly selectedAssets = signal<string[]>([]);
  readonly roomQuery = signal('');
  readonly debouncedRoomQuery = signal('');
  readonly discoveryView = signal<DiscoveryView>('availability');
  readonly collapsedSections = signal<Set<string>>(new Set([]));

  constructor() {
    this.roomQuerySubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(val => this.debouncedRoomQuery.set(val));

    this.capacitySubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(val => this.debouncedMinCapacity.set(val));
  }

  readonly roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms()),
  });

  readonly typesResource = resource({
    loader: () => firstValueFrom(this.roomService.getRoomTypes()),
  });

  readonly assetTypesResource = resource({
    loader: () => firstValueFrom(this.roomService.getAssetTypes()),
  });

  readonly bookingsResource = resource({
    params: () => {
      const anchor = this.selectionStart();
      const dayStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      return {
        start: dayStart.toISOString(),
        end: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1).toISOString(),
      };
    },
    loader: ({ params }) =>
      firstValueFrom(
        this.bookingService.getAllBookings({
          startDate: params.start,
          endDate: params.end,
          pageSize: 1000,
        }),
      ),
  });

  readonly roomTypes = computed(() => this.typesResource.value() ?? []);
  readonly assetTypes = computed(() => this.assetTypesResource.value() ?? []);
  readonly campusOptions = computed<SelectOption[]>(() =>
    this.campuses().map((c) => ({ id: c, label: c })),
  );

  readonly roomTypeOptions = computed<SelectOption[]>(() =>
    this.roomTypes().map((t) => ({ id: t.id, label: t.name })),
  );

  readonly assetTypeOptions = computed<MultiSelectOption[]>(() =>
    this.assetTypes().map((a) => ({ id: a.description, label: a.description })),
  );

  readonly rooms = computed(() => this.roomsResource.value() ?? []);
  readonly maxRoomCapacity = computed(() => {
    const allRooms = this.rooms();
    if (allRooms.length === 0) return 0;
    return Math.max(...allRooms.map((r) => r.capacity ?? 0));
  });
  readonly campuses = computed(() => {
    const values = new Set(
      this.rooms()
        .map((room) => room.campusCity?.trim())
        .filter((city): city is string => Boolean(city)),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'sv'));
  });

  readonly selectionStart = computed(() => {
    const value = `${this.selectedDate()}T${this.startTime() || '00:00'}`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });

  readonly selectionEnd = computed(() => {
    const value = `${this.selectedDate()}T${this.endTime() || '00:00'}`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date(this.selectionStart().getTime() + 60 * 60 * 1000);
    return parsed;
  });

  readonly timeValidationError = computed(() => {
    if (!this.selectedDate() || !this.startTime() || !this.endTime()) {
      return 'Välj datum, starttid och sluttid.';
    }

    if (this.selectionEnd().getTime() <= this.selectionStart().getTime()) {
      return 'Sluttiden måste vara efter starttiden.';
    }

    return null;
  });

  readonly bookings = computed(() => this.bookingsResource.value()?.items ?? []);

  readonly availabilityResource = resource({
    params: () => ({
      startTime: this.selectionStart().toISOString(),
      endTime: this.selectionEnd().toISOString(),
      campus: this.selectedCampus(),
      roomTypeId: this.selectedTypeId(),
      minCapacity: this.debouncedMinCapacity(),
      assets: this.selectedAssets().join(','),
      query: this.debouncedRoomQuery().trim(),
      isInvalid: Boolean(this.timeValidationError()),
    }),
    loader: ({ params }) => {
      if (params.isInvalid) return Promise.resolve([] as RoomAvailabilityResult[]);

      return firstValueFrom(
        this.bookingService.getAvailability({
          startTime: params.startTime,
          endTime: params.endTime,
          campus: params.campus === 'All' ? undefined : params.campus,
          roomTypeId: params.roomTypeId === 'All' ? undefined : params.roomTypeId,
          minCapacity: params.minCapacity > 0 ? params.minCapacity : undefined,
          assets: params.assets || undefined,
          query: params.query || undefined,
        }),
      );
    },
  });

  readonly availabilityCandidates = computed<AvailabilityCandidate[]>(() => {
    const byRoomId = new Map(this.rooms().map((room) => [room.roomId, room]));
    const mapped: AvailabilityCandidate[] = [];
    const currentUserLevel = this.sessionService.permissionLevel();

    for (const item of this.availabilityResource.value() ?? []) {
      const room = byRoomId.get(item.roomId);
      if (!room) continue;

      const conflicts = item.conflicts.map((conflict) => ({
        bookingId: conflict.bookingId,
        roomId: item.roomId,
        roomName: item.roomName,
        campusCity: item.campusCity,
        roomType: item.roomTypeName,
        roomCapacity: item.capacity,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        status: conflict.status,
        userName: conflict.userName,
        userEmail: conflict.userEmail,
        userPermissionLevel: conflict.userPermissionLevel,
        registrationCount: 0,
        invitationCount: 0,
      })) as (BookingDetailedReadModel & { userPermissionLevel?: number })[];

      const isOverridable =
        !item.isAvailable &&
        conflicts.length > 0 &&
        conflicts.every((c) => currentUserLevel > (c.userPermissionLevel ?? 0));

      mapped.push({
        room,
        conflicts,
        isAvailable: item.isAvailable,
        isOverridable,
        nextConflict: conflicts[0],
        matchReasons: item.matchReasons,
        matchScore: item.matchScore,
      });
    }

    return mapped;
  });

  readonly availableRooms = computed(() =>
    this.availabilityCandidates().filter((candidate) => candidate.isAvailable || candidate.isOverridable),
  );
  readonly unavailableRooms = computed(() =>
    this.availabilityCandidates().filter((candidate) => !candidate.isAvailable && !candidate.isOverridable),
  );

  readonly activeSecondaryFilterCount = computed(() => {
    let count = 0;
    if (this.selectedCampus() !== 'All') count++;
    if (this.selectedTypeId() !== 'All') count++;
    if (this.minCapacity() > 0) count++;
    if (this.roomQuery().trim()) count++;
    if (this.selectedAssets().length > 0) count++;
    return count;
  });

  readonly hasAnyActiveFilter = computed(
    () =>
      this.activeSecondaryFilterCount() > 0 ||
      this.selectedDate() !== this.toDateInputValue(new Date()) ||
      this.startTime() !== '09:00' ||
      this.endTime() !== '10:00',
  );

  getFormattedAssets(assets: string[] | null | undefined): string {
    if (!assets || assets.length === 0) return '';
    if (assets.length < 3) return assets.join(', ');
    return `+${assets.length} utr.`;
  }

  getRoomIconType(typeName: string | null | undefined): string {
    if (!typeName) return 'room';
    const lower = typeName.toLowerCase();
    if (lower.includes('labb') || lower.includes('lab')) return 'lab';
    if (lower.includes('klassrum') || lower.includes('klass') || lower.includes('sal')) return 'classroom';
    if (lower.includes('konferens') || lower.includes('möte') || lower.includes('grupprum')) return 'meeting';
    if (lower.includes('dator') || lower.includes('it')) return 'computer';
    return 'room';
  }

  readonly calendarResources = computed<DayPilot.ResourceData[]>(() =>
    this.availabilityCandidates().map((c) => ({
      id: c.room.roomId!.toString(),
      name: c.room.name || 'Okänt rum',
    })),
  );

  setDiscoveryView(view: DiscoveryView): void {
    this.discoveryView.set(view);
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections().has(sectionId);
  }

  toggleSection(sectionId: string): void {
    this.collapsedSections.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }

  updateRoomQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.roomQuery.set(value);
    this.roomQuerySubject.next(value);
  }

  clearRoomQuery(): void {
    this.roomQuery.set('');
    this.roomQuerySubject.next('');
  }

  toggleAsset(assetDescription: string): void {
    const current = this.selectedAssets();
    if (current.includes(assetDescription)) {
      this.selectedAssets.set(current.filter((a) => a !== assetDescription));
    } else {
      this.selectedAssets.set([...current, assetDescription]);
    }
  }

  updateCapacity(value: number): void {
    this.minCapacity.set(value);
    this.capacitySubject.next(value);
  }

  updateCampus(campus: string | number | null): void {
    if (campus != null) {
      this.selectedCampus.set(campus as string);
    }
  }

  updateType(typeId: string | number | null): void {
    if (typeId != null) {
      this.selectedTypeId.set(typeId === 'All' ? 'All' : Number(typeId));
    }
  }

  updateDate(date: string | null): void {
    if (date) {
      this.selectedDate.set(date);
    }
  }

  updateStartTime(time: string | null): void {
    if (time) {
      this.startTime.set(time);
    }
  }

  updateEndTime(time: string | null): void {
    if (time) {
      this.endTime.set(time);
    }
  }

  resetFilters(): void {
    this.selectedDate.set(this.toDateInputValue(new Date()));
    this.startTime.set('09:00');
    this.endTime.set('10:00');
    this.selectedCampus.set('All');
    this.selectedTypeId.set('All');
    this.minCapacity.set(0);
    this.capacitySubject.next(0);
    this.selectedAssets.set([]);
    this.roomQuery.set('');
    this.roomQuerySubject.next('');
  }

  ngOnDestroy(): void {
    // cleanup handled by takeUntilDestroyed
  }

  useSuggestedSlot(date: Date): void {
    this.selectedDate.set(this.toDateInputValue(date));
    this.startTime.set(this.toTimeInputValue(date));
    this.endTime.set(this.toTimeInputValue(new Date(date.getTime() + 60 * 60 * 1000)));
    this.discoveryView.set('availability');
  }

  onCalendarDateChange(date: Date): void {
    this.selectedDate.set(this.toDateInputValue(date));
  }

  onTimeRangeSelected(event: { start: Date; end: Date; resourceId?: number }): void {
    if (event.resourceId === undefined) return;
    const room = this.rooms().find((candidate) => candidate.roomId === event.resourceId);
    if (!room) return;

    this.openBookingModal(room, event.start, event.end);
  }

  onBookRoom(room: RoomDetailModel): void {
    this.openBookingModal(room, this.selectionStart(), this.selectionEnd());
  }

  onEventClicked(booking: BookingDetailedReadModel): void {
    this.modalService.open(BookingDetailModalComponent, {
      title: 'Bokningsdetaljer',
      data: { booking },
      width: '520px',
    });
  }

  private openBookingModal(room: RoomDetailModel, start: Date, end: Date): void {
    this.modalService.open(BookingModalComponent, {
      title: `Boka ${room.name}`,
      data: {
        ...room,
        prefillStart: start,
        prefillEnd: end,
        onBookingCreated: () => this.bookingsResource.reload(),
      },
      width: '600px',
    });
  }

  private toDateInputValue(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private toTimeInputValue(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
