import { Component, ElementRef, HostListener, Input, ModelSignal, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  id: string | number;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-select" [class.is-open]="isOpen()" (click)="toggleOpen()">
      <div class="select-trigger">
        <div class="selected-text">
          @if (value() == null || value() === '') {
            <span class="placeholder">{{ placeholder }}</span>
          } @else {
            <span>{{ getLabelForId(value()!) }}</span>
          }
        </div>
        <svg class="chevron" [class.rotated]="isOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      @if (isOpen()) {
        <div class="dropdown-menu" (click)="$event.stopPropagation()">
          @for (option of options; track option.id) {
            <div 
              class="dropdown-item" 
              [class.selected]="String(option.id) === String(value())"
              (click)="selectOption(option.id)"
            >
              <span>{{ option.label }}</span>
              @if (String(option.id) === String(value())) {
                <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              }
            </div>
          }
          @if (options.length === 0) {
            <div class="dropdown-item empty">Inga alternativ</div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './select.component.scss'
})
export class SelectComponent {
  @Input({ required: true }) options: SelectOption[] = [];
  @Input() placeholder = 'Välj...';
  
  value = model<string | number | null>(null);
  isOpen = signal(false);

  // Helper string casting for template comparisons
  readonly String = String;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen() {
    this.isOpen.update(v => !v);
  }

  selectOption(id: string | number) {
    this.value.set(id);
    this.isOpen.set(false);
  }

  getLabelForId(id: string | number): string {
    const stringId = String(id);
    return this.options.find(o => String(o.id) === stringId)?.label || stringId;
  }
}
