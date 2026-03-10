import { Component, Input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-number-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-number-picker">
      <button type="button" class="ctrl-btn" (click)="decrement()" [disabled]="value() <= min">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <input 
        type="number" 
        [value]="value() || ''" 
        (input)="onInput($event)"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        [min]="min"
        [max]="max"
      />
      <button type="button" class="ctrl-btn" (click)="increment()" [disabled]="value() >= max">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  `,
  styleUrl: './number-picker.component.scss'
})
export class NumberPickerComponent {
  value = model<number>(0);
  @Input() min: number = 0;
  @Input() max: number = 999;
  @Input() placeholder: string = '';

  decrement() {
    const current = Number(this.value()) || 0;
    if (current > this.min) {
      this.value.set(current - 1);
    } else {
      this.value.set(this.min);
    }
  }

  increment() {
    const current = Number(this.value()) || 0;
    if (current < this.max) {
      this.value.set(current + 1);
    } else {
      this.value.set(this.max);
    }
  }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    if (val === '') {
      this.value.set(0);
      return;
    }
    const num = Number(val);
    if (!isNaN(num)) {
      this.value.set(num);
    }
  }
  
  onBlur() {
    let current = Number(this.value()) || 0;
    if (current < this.min) current = this.min;
    if (current > this.max) current = this.max;
    this.value.set(current);
  }
}
