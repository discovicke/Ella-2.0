import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  title = input<string>('');
  description = input<string>('');
  mode = input<'static' | 'overlay'>('static');
  position = input<'left' | 'right'>('right');
  width = input<string>('100%');
}
