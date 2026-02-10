import { ChangeDetectionStrategy, Component, input, Input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'tertiary' | 'danger'|'success'>('primary');
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  clicked = output<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
