import { Component, Input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-slider">
      <input 
        type="range" 
        [value]="isDragging() ? dragValue() : (value() || 0)" 
        (input)="onDrag($event)"
        (change)="onChange($event)"
        [min]="min"
        [max]="max"
        class="slider-input"
      />
      <div class="slider-value-display">
        <span class="value-text">{{ isDragging() ? dragValue() : (value() || 0) }}</span>
        <span *ngIf="suffix" class="suffix-text">{{ suffix }}</span>
      </div>
    </div>
  `,
  styleUrl: './slider.component.scss'
})
export class SliderComponent {
  value = model<number>(0);
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() suffix: string = '';

  isDragging = signal(false);
  dragValue = signal(0);

  onDrag(event: Event) {
    this.isDragging.set(true);
    const val = (event.target as HTMLInputElement).value;
    this.dragValue.set(Number(val));
  }

  onChange(event: Event) {
    this.isDragging.set(false);
    const val = (event.target as HTMLInputElement).value;
    this.value.set(Number(val));
  }
}
