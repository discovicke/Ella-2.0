import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../shared/services/layout.service';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/session.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './main.layout.html',
  styleUrl: './main.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  public readonly layoutService = inject(LayoutService);
  public readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);

  async logout() {
    this.layoutService.closeSidebar();
    await this.authService.logout();
  }
}
