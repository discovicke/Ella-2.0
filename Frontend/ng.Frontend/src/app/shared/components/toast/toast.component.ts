import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { ToastItemComponent } from './toast-item.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, ToastItemComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected toastService = inject(ToastService);
}