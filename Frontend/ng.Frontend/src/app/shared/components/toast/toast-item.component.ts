import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="toast" 
      [class]="'toast-' + toast().type"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (click)="dismissToast($event)"
      role="alert">
      
      <div class="toast-icon">
        @switch (toast().type) {
          @case ('success') { 🎉 }
          @case ('error') { ⚠️ }
          @default { 🔔 }
        }
      </div>

      <div class="toast-content">
        @if (toast().title) {
          <div class="toast-title">{{ toast().title }}</div>
        }
        <div class="toast-desc">{{ toast().message }}</div>
      </div>

      <button class="toast-close" (click)="onCloseClick($event)" aria-label="Close">
        &times;
      </button>

      <!-- Progress bar -->
      <div 
        class="toast-progress" 
        [style.animation-duration]="toast().duration + 'ms'"
        [style.animation-play-state]="isPaused() ? 'paused' : 'running'">
      </div>
    </div>
  `,
  styleUrls: ['./toast-item.component.scss']
})
export class ToastItemComponent {
  toast = input.required<Toast>();
  dismiss = output<number>();

  isPaused = signal(false);
  private timer: any;
  private remainingTime = 0;
  private startTime = 0;

  constructor() {
    effect(() => {
      // Start timer when toast is loaded
      this.remainingTime = this.toast().duration;
      this.resume();
    });
  }

  pause() {
    this.isPaused.set(true);
    clearTimeout(this.timer);
    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);
  }

  resume() {
    this.isPaused.set(false);
    this.startTime = Date.now();
    
    // Clear any existing timer to be safe
    clearTimeout(this.timer);
    
    this.timer = setTimeout(() => {
      this.dismiss.emit(this.toast().id);
    }, this.remainingTime);
  }

  dismissToast(event: MouseEvent) {
    // Dismiss on click anywhere (unless handled by close button)
    this.dismiss.emit(this.toast().id);
  }

  onCloseClick(event: MouseEvent) {
    event.stopPropagation();
    this.dismiss.emit(this.toast().id);
  }
}
