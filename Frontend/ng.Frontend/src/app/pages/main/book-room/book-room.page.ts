import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  inject,
  resource,
  signal,
} from '@angular/core';
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
import { ModalService } from '../../../shared/services/modal.service';
import { RoomService } from '../../../shared/services/room.service';
import { BookingModalComponent } from './booking-modal/booking-modal.component';

type DiscoveryView = 'availability' | 'schedule';

interface AvailabilityCandidate {
  room: RoomDetailModel;
  conflicts: BookingDetailedReadModel[];
  isAvailable: boolean;
  nextConflict?: BookingDetailedReadModel;
  matchReasons: string[];
  matchScore: number;
}

@Component({
  selector: 'app-book-room-page',
  imports: [CalendarComponent, DatePipe, FormsModule],
  templateUrl: './book-room.page.html',
  styleUrl: './book-room.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookRoomPage implements OnDestroy {
  private readonly roomService = inject(RoomService);
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private roomQueryDebounceTimer?: ReturnType<typeof setTimeout>;
  private assetQueryDebounceTimer?: ReturnType<typeof setTimeout>;
  private readonly filterDebounceMs = 300;

  readonly selectedDate = signal(this.toDateInputValue(new Date()));
  readonly startTime = signal('09:00');
  readonly endTime = signal('10:00');
  readonly selectedCampus = signal('All');
  readonly selectedTypeId = signal<number | 'All'>('All');
  readonly minCapacity = signal<number>(0);
  readonly assetQuery = signal('');
  readonly debouncedAssetQuery = signal('');
  readonly roomQuery = signal('');
  readonly debouncedRoomQuery = signal('');
  readonly discoveryView = signal<DiscoveryView>('availability');

  readonly roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms()),
  });

  readonly typesResource = resource({
    loader: () => firstValueFrom(this.roomService.getRoomTypes()),
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
  readonly rooms = computed(() => this.roomsResource.value() ?? []);
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
      minCapacity: this.minCapacity(),
      assets: this.debouncedAssetQuery().trim(),
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
          registrationCount: 0,
          invitationCount: 0,
        })) as BookingDetailedReadModel[];

        mapped.push({
          room,
          conflicts,
          isAvailable: item.isAvailable,
          nextConflict: conflicts[0],
          matchReasons: item.matchReasons,
          matchScore: item.matchScore,
        });
      }

    return mapped;
  });

  readonly availableRooms = computed(() => this.availabilityCandidates().filter((candidate) => candidate.isAvailable));
  readonly unavailableRooms = computed(() =>
    this.availabilityCandidates().filter((candidate) => !candidate.isAvailable),
  );

  readonly activeSecondaryFilterCount = computed(() => {
    let count = 0;
    if (this.selectedCampus() !== 'All') count++;
    if (this.selectedTypeId() !== 'All') count++;
    if (this.minCapacity() > 0) count++;
    if (this.roomQuery().trim()) count++;
    if (this.assetQuery().trim()) count++;
    return count;
  });

  readonly hasAnyActiveFilter = computed(
    () =>
      this.activeSecondaryFilterCount() > 0 ||
      this.selectedDate() !== this.toDateInputValue(new Date()) ||
      this.startTime() !== '09:00' ||
      this.endTime() !== '10:00',
  );

  readonly calendarResources = computed<DayPilot.ResourceData[]>(() =>
    this.availabilityCandidates().map((c) => ({
      id: c.room.roomId!.toString(),
      name: c.room.name || 'Okänt rum',
    })),
  );

  setDiscoveryView(view: DiscoveryView): void {
    this.discoveryView.set(view);
  }

  updateRoomQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.roomQuery.set(value);
    this.scheduleRoomQueryDebounce(value);
  }

  updateAssetQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.assetQuery.set(value);
    this.scheduleAssetQueryDebounce(value);
  }

  updateCapacity(event: Event): void {
    this.minCapacity.set(Number((event.target as HTMLInputElement).value || 0));
  }

  updateCampus(event: Event): void {
    this.selectedCampus.set((event.target as HTMLSelectElement).value);
  }

  updateType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTypeId.set(value === 'All' ? 'All' : Number(value));
  }

  onDatePicked(event: Event): void {
    this.selectedDate.set((event.target as HTMLInputElement).value);
  }

  onStartTimePicked(event: Event): void {
    this.startTime.set((event.target as HTMLInputElement).value);
  }

  onEndTimePicked(event: Event): void {
    this.endTime.set((event.target as HTMLInputElement).value);
  }

  resetFilters(): void {
    this.selectedDate.set(this.toDateInputValue(new Date()));
    this.startTime.set('09:00');
    this.endTime.set('10:00');
    this.selectedCampus.set('All');
    this.selectedTypeId.set('All');
    this.minCapacity.set(0);
    this.assetQuery.set('');
    this.debouncedAssetQuery.set('');
    this.roomQuery.set('');
    this.debouncedRoomQuery.set('');
    this.clearFilterDebounceTimers();
  }

  ngOnDestroy(): void {
    this.clearFilterDebounceTimers();
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

  private scheduleRoomQueryDebounce(value: string): void {
    if (this.roomQueryDebounceTimer) {
      clearTimeout(this.roomQueryDebounceTimer);
    }

    this.roomQueryDebounceTimer = setTimeout(() => {
      this.debouncedRoomQuery.set(value);
      this.roomQueryDebounceTimer = undefined;
    }, this.filterDebounceMs);
  }

  private scheduleAssetQueryDebounce(value: string): void {
    if (this.assetQueryDebounceTimer) {
      clearTimeout(this.assetQueryDebounceTimer);
    }

    this.assetQueryDebounceTimer = setTimeout(() => {
      this.debouncedAssetQuery.set(value);
      this.assetQueryDebounceTimer = undefined;
    }, this.filterDebounceMs);
  }

  private clearFilterDebounceTimers(): void {
    if (this.roomQueryDebounceTimer) {
      clearTimeout(this.roomQueryDebounceTimer);
      this.roomQueryDebounceTimer = undefined;
    }

    if (this.assetQueryDebounceTimer) {
      clearTimeout(this.assetQueryDebounceTimer);
      this.assetQueryDebounceTimer = undefined;
    }
  }
}
