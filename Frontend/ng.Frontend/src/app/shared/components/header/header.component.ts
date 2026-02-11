import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { SessionService } from '../../../core/session.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);

  async logout() {
    await this.authService.logout();
  }
}
