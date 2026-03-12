import { Component, ElementRef, input, computed, model, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MultiSelectOption {
  id: string | number;
  label: string;
}

@Component({
  selector: 'app-multi-select',
  imports: [CommonModule],
  template: `
    <div class="custom-multiselect" [class.is-open]="isOpen()" (click)="toggleOpen()">
      <div class="select-trigger">
        <div class="selected-text">
          @if (selectedIds().length === 0) {
            <span class="placeholder">{{ placeholder() }}</span>
          } @else if (selectedIds().length === 1) {
            <span>{{ getLabelForId(selectedIds()[0]) }}</span>
          } @else {
            <span>{{ selectedIds().length }} valda</span>
          }
        </div>
        <svg class="chevron" [class.rotated]="isOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      @if (isOpen()) {
        <div class="dropdown-menu" (click)="$event.stopPropagation()">
          @for (option of options(); track option.id) {
            <label class="dropdown-item" [class.selected]="isSelected(option.id)">
              <div class="checkbox-box">
                @if (isSelected(option.id)) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                }
              </div>
              <span>{{ option.label }}</span>
              <input 
                type="checkbox" 
                class="hidden-input"
                [checked]="isSelected(option.id)" 
                (change)="toggleOption(option.id)" 
              />
            </label>
          }
          @if (options().length === 0) {
            <div class="dropdown-item empty">Inga alternativ</div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './multi-select.component.scss',
  host: {
    '(document:click)': 'clickOutside($event)'
  }
})
export class MultiSelectComponent {
  options = input.required<MultiSelectOption[]>();
  placeholder = input('Välj...');
  
  selectedIds = model<string[]>([]);
  isOpen = signal(false);

  private elementRef = inject(ElementRef);

  clickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen() {
    this.isOpen.update(v => !v);
  }

  isSelected(id: string | number): boolean {
    return this.selectedIds().includes(String(id));
  }

  toggleOption(id: string | number) {
    const stringId = String(id);
    const current = this.selectedIds();
    
    if (current.includes(stringId)) {
      this.selectedIds.set(current.filter(i => i !== stringId));
    } else {
      this.selectedIds.set([...current, stringId]);
    }
  }

  getLabelForId(id: string | number): string {
    const stringId = String(id);
    return this.options().find(o => String(o.id) === stringId)?.label || stringId;
  }
}
