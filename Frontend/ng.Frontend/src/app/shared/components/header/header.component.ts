import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { SessionService } from '../../../core/session.service';
import { AuthService } from '../../../core/auth/auth.service';
import { LayoutService } from '../../services/layout.service';
import { resolveRoleLabel } from '../../../core/permission-templates';

@Component({
  selector: 'app-header',
  imports: [ButtonComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly sessionService = inject(SessionService);
  public readonly layoutService = inject(LayoutService);
  private readonly authService = inject(AuthService);

  readonly resolveRoleLabel = resolveRoleLabel;

  async logout() {
    await this.authService.logout();
  }
}
