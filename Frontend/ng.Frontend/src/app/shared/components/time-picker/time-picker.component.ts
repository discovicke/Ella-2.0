import { Component, ElementRef, HostListener, Input, ModelSignal, OnInit, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-select" [class.is-open]="isOpen()" (click)="toggleOpen()">
      <div class="select-trigger">
        <div class="selected-text">
          <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          @if (value() == null || value() === '') {
            <span class="placeholder">--:--</span>
          } @else {
            <span>{{ value() }}</span>
          }
        </div>
        <svg class="chevron" [class.rotated]="isOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      @if (isOpen()) {
        <div class="dropdown-menu" (click)="$event.stopPropagation()">
          @for (time of timeOptions; track time) {
            <div 
              class="dropdown-item" 
              [class.selected]="time === value()"
              (click)="selectTime(time)"
              [id]="'time-' + time.replace(':', '')"
            >
              <span>{{ time }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './time-picker.component.scss'
})
export class TimePickerComponent implements OnInit {
  value = model<string | null>(null); // Format: HH:mm
  isOpen = signal(false);
  timeOptions: string[] = [];

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.generateTimeOptions();
  }

  generateTimeOptions() {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hourStr = h.toString().padStart(2, '0');
        const minStr = m.toString().padStart(2, '0');
        options.push(`${hourStr}:${minStr}`);
      }
    }
    this.timeOptions = options;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen() {
    this.isOpen.update(v => !v);
    
    // Scroll to selected after a brief delay so DOM is rendered
    if (this.isOpen() && this.value()) {
      setTimeout(() => {
        const id = 'time-' + this.value()?.replace(':', '');
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: 'center' });
        }
      }, 0);
    }
  }

  selectTime(time: string) {
    this.value.set(time);
    this.isOpen.set(false);
  }
}
