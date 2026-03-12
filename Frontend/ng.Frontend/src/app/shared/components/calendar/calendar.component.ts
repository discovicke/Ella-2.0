import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ViewEncapsulation,
} from '@angular/core';
import { DayPilot, DayPilotModule } from '@daypilot/daypilot-lite-angular';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'resources';

/**
 * Optional callback for determining the CSS class of a calendar event.
 * If provided, overrides the built-in status-based logic.
 */
export type EventCssClassFn = (booking: BookingDetailedReadModel) => string;

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [DayPilotModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CalendarComponent implements OnChanges, AfterViewInit {
  @Input() viewMode: CalendarViewMode = 'week';
  @Input() date: Date = new Date();
  @Input() bookings: BookingDetailedReadModel[] = [];
  @Input() resources: DayPilot.ResourceData[] = [];
  @Input() isLoading = false;
  @Input() hasError = false;
  @Input() allowTimeRangeSelection = false;
  @Input() businessBeginsHour = 7;
  @Input() businessEndsHour = 19;
  /** Optional override for event CSS class logic. */
  @Input() eventCssClassFn?: EventCssClassFn;

  @Output() dateChange = new EventEmitter<Date>();
  @Output() timeRangeSelected = new EventEmitter<{ start: Date; end: Date; resourceId?: number }>();
  @Output() eventClicked = new EventEmitter<BookingDetailedReadModel>();

  /** Internal navigation date — synced from @Input date, then owned by nav buttons. */
  currentDate: DayPilot.Date = this.toDpDate(this.date);

  configDay: DayPilot.CalendarConfig = this.buildCalendarConfig('Day');
  configWeek: DayPilot.CalendarConfig = this.buildCalendarConfig('Week');
  configResources: DayPilot.CalendarConfig = this.buildResourcesConfig();
  configMonth: DayPilot.MonthConfig = this.buildMonthConfig();

  events: DayPilot.EventData[] = [];

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  get navigationLabel(): string {
    const d = this.currentDate;
    switch (this.viewMode) {
      case 'day':
      case 'resources':
        return d.toString('d MMMM yyyy', 'sv-se');
      case 'week': {
        const today = DayPilot.Date.today();
        const weekStart = d.firstDayOfWeek(1); // Monday-based (ISO)
        const weekEnd = weekStart.addDays(6);
        const weekNumber = weekStart.weekNumber();

        const currentWeekStart = today.firstDayOfWeek(1);
        const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();
        const isNextWeek = weekStart.getTime() === currentWeekStart.addDays(7).getTime();
        const isPrevWeek = weekStart.getTime() === currentWeekStart.addDays(-7).getTime();

        let prefix = `Vecka ${weekNumber}`;
        if (isCurrentWeek) prefix = 'Denna vecka';
        else if (isNextWeek) prefix = 'Nästa vecka';
        else if (isPrevWeek) prefix = 'Förra veckan';

        const startStr = weekStart.toString('d MMM', 'sv-se');
        const endStr = weekEnd.toString('d MMM yyyy', 'sv-se');
        return `${prefix}: ${startStr} – ${endStr}`;
      }
      case 'month':
        return d.toString('MMMM yyyy', 'sv-se');
    }
  }

  navigatePrev(): void {
    this.currentDate = this.shiftDate(-1);
    this.applyDateToConfigs();
    this.dateChange.emit(this.currentDate.toDateLocal());
  }

  navigateNext(): void {
    this.currentDate = this.shiftDate(1);
    this.applyDateToConfigs();
    this.dateChange.emit(this.currentDate.toDateLocal());
  }

  navigateToday(): void {
    this.currentDate = this.toDpDate(new Date());
    this.applyDateToConfigs();
    this.dateChange.emit(this.currentDate.toDateLocal());
  }

  private shiftDate(direction: 1 | -1): DayPilot.Date {
    const d = this.currentDate;
    switch (this.viewMode) {
      case 'day':
      case 'resources':
        return d.addDays(direction);
      case 'week':
        return d.addDays(direction * 7);
      case 'month':
        return d.addMonths(direction);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date']) {
      this.currentDate = this.toDpDate(this.date);
    }

    if (
      changes['date'] ||
      changes['resources'] ||
      changes['allowTimeRangeSelection'] ||
      changes['businessBeginsHour'] ||
      changes['businessEndsHour']
    ) {
      this.refreshConfigs();
    }

    if (changes['bookings']) {
      this.updateEvents();
    }
  }

  ngAfterViewInit(): void {
    this.updateEvents();
  }

  // ---------------------------------------------------------------------------
  // Config builders
  // ---------------------------------------------------------------------------

  private refreshConfigs(): void {
    this.configDay = this.buildCalendarConfig('Day');
    this.configWeek = this.buildCalendarConfig('Week');
    this.configMonth = this.buildMonthConfig();
    this.configResources = this.buildResourcesConfig();
  }

  private buildCalendarConfig(viewType: 'Day' | 'Week'): DayPilot.CalendarConfig {
    const startDate = viewType === 'Week' ? this.currentDate.firstDayOfWeek(1) : this.currentDate;
    return {
      viewType,
      startDate,
      weekStarts: 1,
      locale: 'sv-se',
      businessBeginsHour: this.businessBeginsHour,
      businessEndsHour: this.businessEndsHour,
      heightSpec: 'BusinessHoursNoScroll',
      eventMoveHandling: 'Disabled',
      eventResizeHandling: 'Disabled',
      eventDeleteHandling: 'Disabled',
      timeRangeSelectedHandling: this.allowTimeRangeSelection ? 'Enabled' : 'Disabled',
      onTimeRangeSelected: (args) => {
        this.timeRangeSelected.emit({
          start: new Date(args.start.toString()),
          end: new Date(args.end.toString()),
          resourceId: args.resource ? Number(args.resource) : undefined,
        });
        args.control.clearSelection();
      },
      eventClickHandling: 'Enabled',
      onEventClick: (args) => {
        const booking = args.e.data.tags?.booking as BookingDetailedReadModel;
        if (booking) this.eventClicked.emit(booking);
      },
      onBeforeHeaderRender: (args) => {
        const date = args.column.start;
        const today = DayPilot.Date.today();
        const isToday = date.toString('yyyy-MM-dd') === today.toString('yyyy-MM-dd');

        // Swedish abbreviated weekdays: 0=Sön, 1=Mån, ..., 6=Lör
        const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
        const dayIndex = date.getDayOfWeek();
        const weekdayName = weekdays[dayIndex];
        const dayNum = date.getDay();
        const monthNum = date.getMonth(); // 1-12 in DayPilot.Date

        args.header.html = `<div class="cal-header-content">
          <span class="cal-header-weekday">${weekdayName}</span>
          <span class="cal-header-date">${dayNum}/${monthNum}</span>
        </div>`;

        if (isToday) {
          args.header.backColor = 'var(--color-primary-surface, #f4eafb)';
          args.header.cssClass = 'cal-header-today';
        }
      },
    };
  }

  private buildResourcesConfig(): DayPilot.CalendarConfig {
    return {
      ...this.buildCalendarConfig('Day'),
      viewType: 'Resources',
      columns: this.resources.map(r => ({
        name: r.name || 'Unknown',
        id: r.id,
      })) as DayPilot.CalendarColumnData[],
    };
  }

  private buildMonthConfig(): DayPilot.MonthConfig {
    const todayStr = this.toDpDate(new Date()).toString('yyyy-MM-dd');
    return {
      startDate: this.currentDate,
      weekStarts: 1,
      locale: 'sv-se',
      timeRangeSelectedHandling: 'Disabled',
      eventMoveHandling: 'Disabled',
      eventResizeHandling: 'Disabled',
      eventDeleteHandling: 'Disabled',
      eventClickHandling: 'Enabled',
      onEventClick: (args) => {
        const booking = args.e.data.tags?.booking as BookingDetailedReadModel;
        if (booking) this.eventClicked.emit(booking);
      },
      onBeforeCellRender: (args) => {
        if (args.cell.start.toString('yyyy-MM-dd') === todayStr) {
          args.cell.properties.backColor = 'var(--color-primary-surface, #f4eafb)';
          const dayNum = args.cell.start.getDay();
          args.cell.properties.headerHtml = `<div class="cal-month-today-badge">${dayNum}</div>`;
        }
      },
    };
  }

  private applyDateToConfigs(): void {
    const d = this.currentDate;
    this.configDay = { ...this.configDay, startDate: d };
    this.configWeek = { ...this.configWeek, startDate: d.firstDayOfWeek(1) };
    this.configMonth = { ...this.configMonth, startDate: d };
    this.configResources = { ...this.configResources, startDate: d };
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private getEventCssClass(b: BookingDetailedReadModel): string {
    if (this.eventCssClassFn) return this.eventCssClassFn(b);

    if (b.status === BookingStatus.Cancelled || b.status === BookingStatus.Expired) {
      return 'event-cancelled';
    }

    // Handle enriched fields from see-bookings page (EnrichedBooking carries these)
    const enriched = b as BookingDetailedReadModel & {
      isInvitation?: boolean;
      isDeclined?: boolean;
      isExpiredInvitation?: boolean;
      isAttending?: boolean;
    };

    // Pending invitation — action needed (green, matching list "Ny inbjudan")
    if (enriched.isInvitation) return 'event-invitation';
    // Declined invitation (red surface, matching list)
    if (enriched.isDeclined) return 'event-declined';
    // Expired invitation — never responded (muted grey, matching list "Ej svarad")
    if (enriched.isExpiredInvitation) return 'event-expired-invitation';
    // Accepted / attending (blue, matching list "Inbjuden")
    if (enriched.isAttending) return 'event-attending';

    return b.status === BookingStatus.Pending ? 'event-pending' : 'event-active';
  }

  private updateEvents(): void {
    // Deduplicate by bookingId — own booking (first occurrence) wins over registration copy.
    const seen = new Set<number>();
    const unique = this.bookings.filter((b) => {
      const id = b.bookingId ?? 0;
      if (id > 0 && seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    this.events = unique.map((b) => {
      const cssClass = this.getEventCssClass(b);
      const isCancelledOrExpired =
        b.status === BookingStatus.Cancelled || b.status === BookingStatus.Expired;
      const label = `${b.roomName} - ${b.userName || b.userEmail}`;
      const html = isCancelledOrExpired
        ? `<div style="text-decoration: line-through;">${label}</div>`
        : `<div>${label}</div>`;

      return {
        id: b.bookingId!,
        start: this.toEventDateTime(b.startTime),
        end: this.toEventDateTime(b.endTime),
        text: label,
        html,
        resource: b.roomId?.toString(),
        tags: { booking: b },
        cssClass,
      };
    });
  }

  private toDpDate(d: Date): DayPilot.Date {
    return DayPilot.Date.fromYearMonthDay(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
    );
  }

  private toEventDateTime(value?: string | null): DayPilot.Date {
    if (!value) return new DayPilot.Date();

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new DayPilot.Date(value);
    }

    return new DayPilot.Date(this.toLocalDateTimeString(parsed));
  }

  private toLocalDateTimeString(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
