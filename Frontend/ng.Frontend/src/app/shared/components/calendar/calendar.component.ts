import {
  Component,
  ChangeDetectionStrategy,
  AfterViewInit,
  ViewEncapsulation,
  input,
  output,
  effect,
  untracked,
} from '@angular/core';
import { DayPilot, DayPilotModule } from '@daypilot/daypilot-lite-angular';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'resources';

/**
 * Optional callback for determining the CSS class of a calendar event.
 * If provided, overrides the built-in status-based logic.
 */
export type EventCssClassFn = (booking: BookingDetailedReadModel) => string;

/**
 * Optional callback for determining the HTML content of a calendar event.
 */
export type EventHtmlFn = (booking: BookingDetailedReadModel) => string;

@Component({
  selector: 'app-calendar',
  imports: [DayPilotModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CalendarComponent implements AfterViewInit {
  viewMode = input<CalendarViewMode>('week');
  date = input<Date>(new Date());
  bookings = input<BookingDetailedReadModel[]>([]);
  resources = input<DayPilot.ResourceData[]>([]);
  isLoading = input<boolean>(false);
  hasError = input<boolean>(false);
  allowTimeRangeSelection = input<boolean>(false);
  businessBeginsHour = input<number>(7);
  businessEndsHour = input<number>(19);

  eventCssClassFn = input<EventCssClassFn | undefined>();
  eventHtmlFn = input<EventHtmlFn | undefined>();

  dateChange = output<Date>();
  timeRangeSelected = output<{ start: Date; end: Date; resourceId?: number }>();
  eventClicked = output<BookingDetailedReadModel>();

  /** Internal navigation date — synced from @Input date, then owned by nav buttons. */
  currentDate: DayPilot.Date;

  configDay!: DayPilot.CalendarConfig;
  configWeek!: DayPilot.CalendarConfig;
  configResources!: DayPilot.CalendarConfig;
  configMonth!: DayPilot.MonthConfig;

  events: DayPilot.EventData[] = [];

  constructor() {
    this.currentDate = this.toDpDate(new Date());
    
    // React to changes in date input
    effect(() => {
      const d = this.date();
      untracked(() => {
        this.currentDate = this.toDpDate(d);
        this.applyDateToConfigs();
      });
    });

    // React to changes in configuration inputs
    effect(() => {
      this.date();
      this.resources();
      this.allowTimeRangeSelection();
      this.businessBeginsHour();
      this.businessEndsHour();
      untracked(() => {
        this.refreshConfigs();
      });
    });

    // React to changes in bookings
    effect(() => {
      this.bookings();
      untracked(() => {
        this.updateEvents();
      });
    });
  }

  get calendarWidth(): string | null {
    if (this.viewMode() === 'resources' && this.resources().length > 0) {
      const minWidth = 130;
      const hourColumnWidth = 50; // Approximation for the time column on the left
      return `${this.resources().length * minWidth + hourColumnWidth}px`;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  get navigationLabel(): string {
    const d = this.currentDate;
    switch (this.viewMode()) {
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
    switch (this.viewMode()) {
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
      hourWidth: 50,
      businessBeginsHour: this.businessBeginsHour(),
      businessEndsHour: this.businessEndsHour(),
      cellHeight: 28,
      heightSpec: 'BusinessHoursNoScroll',
      eventMoveHandling: 'Disabled',
      eventResizeHandling: 'Disabled',
      eventDeleteHandling: 'Disabled',
      timeRangeSelectedHandling: this.allowTimeRangeSelection() ? 'Enabled' : 'Disabled',
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
      ...({ columnWidth: 130 } as any),
      columns: this.resources().map((r) => ({
        name: r.name || 'Unknown',
        id: r.id,
      })) as DayPilot.CalendarColumnData[],
      onBeforeHeaderRender: (args) => {
        args.header.html = `<div class="cal-header-content">
          <span class="cal-header-resource" title="${args.column.name}">${args.column.name}</span>
        </div>`;
      },
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
    const customFn = this.eventCssClassFn();
    if (customFn) return customFn(b);

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
    const unique = this.bookings().filter((b) => {
      const id = b.bookingId ?? 0;
      if (id > 0 && seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    this.events = unique.map((b) => {
      const cssClass = this.getEventCssClass(b);
      const isCancelledOrExpired =
        b.status === BookingStatus.Cancelled || b.status === BookingStatus.Expired;

      const start = this.toEventDateTime(b.startTime);
      const end = this.toEventDateTime(b.endTime);
      const timeStr = `${start.toString('HH:mm')}–${end.toString('HH:mm')}`;
      
      let html = '';
      const htmlFn = this.eventHtmlFn();
      if (htmlFn) {
        html = htmlFn(b);
      } else {
        const label = `${b.roomName} ${timeStr}`;
        html = isCancelledOrExpired
          ? `<div style="text-decoration: line-through;">${label}</div>`
          : `<div>${label}</div>`;
      }

      return {
        id: b.bookingId!,
        start,
        end,
        text: b.roomName ?? '',
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