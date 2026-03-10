import { Component, ElementRef, HostListener, Input, OnInit, computed, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-select" [class.is-open]="isOpen()" (click)="toggleOpen()">
      <div class="select-trigger">
        <div class="selected-text">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          @if (value() == null || value() === '') {
            <span class="placeholder">Välj datum...</span>
          } @else {
            <span>{{ value() }}</span>
          }
        </div>
        <svg class="chevron" [class.rotated]="isOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      @if (isOpen()) {
        <div class="dropdown-menu calendar-dropdown" (click)="$event.stopPropagation()">
          <div class="calendar-header">
            <button class="nav-btn" (click)="prevMonth()" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="month-title">{{ currentMonthName() }} {{ currentYear() }}</span>
            <button class="nav-btn" (click)="nextMonth()" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          
          <div class="calendar-grid">
            <div class="weekday">Må</div>
            <div class="weekday">Ti</div>
            <div class="weekday">On</div>
            <div class="weekday">To</div>
            <div class="weekday">Fr</div>
            <div class="weekday">Lö</div>
            <div class="weekday">Sö</div>
            
            @for (day of calendarDays(); track day.dateStr) {
              <button 
                class="day-btn" 
                [class.empty]="day.isEmpty"
                [class.selected]="day.dateStr === value()"
                [class.today]="day.isToday"
                (click)="!day.isEmpty && selectDate(day.dateStr)"
                [disabled]="day.isEmpty"
                type="button"
              >
                {{ day.dayNumber || '' }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements OnInit {
  value = model<string | null>(null); // Format: YYYY-MM-DD
  isOpen = signal(false);
  
  viewDate = signal(new Date());

  currentMonthName = computed(() => {
    return this.viewDate().toLocaleString('sv-SE', { month: 'long' });
  });

  currentYear = computed(() => {
    return this.viewDate().getFullYear();
  });

  calendarDays = computed(() => {
    const date = this.viewDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    
    // JS days: 0 = Sun, 1 = Mon ... 6 = Sat
    // We want Mon = 1, Sun = 7
    let firstDayIndex = firstDayOfMonth.getDay() || 7;
    
    const days = [];
    
    // Empty slots before 1st of month
    for (let i = 1; i < firstDayIndex; i++) {
      days.push({ isEmpty: true, dayNumber: null, dateStr: `empty-${i}`, isToday: false });
    }
    
    const todayStr = this.formatDate(new Date());
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = this.formatDate(d);
      days.push({
        isEmpty: false,
        dayNumber: i,
        dateStr,
        isToday: dateStr === todayStr
      });
    }
    
    return days;
  });

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    if (this.value()) {
      const parsed = new Date(this.value() as string);
      if (!Number.isNaN(parsed.getTime())) {
        this.viewDate.set(parsed);
      }
    }
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen() {
    if (!this.isOpen() && this.value()) {
      const parsed = new Date(this.value() as string);
      if (!Number.isNaN(parsed.getTime())) {
        this.viewDate.set(parsed);
      }
    }
    this.isOpen.update(v => !v);
  }

  prevMonth() {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDate(dateStr: string) {
    this.value.set(dateStr);
    this.isOpen.set(false);
  }
}
