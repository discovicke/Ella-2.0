import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../shared/services/layout.service';
import { SessionService } from '../../core/session.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { resolveRoleLabel } from '../../core/permission-templates';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main.layout.html',
  styleUrl: './main.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  public readonly layoutService = inject(LayoutService);
  public readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmService);

  readonly resolveRoleLabel = resolveRoleLabel;

  /** True when the user has at least one admin-level permission */
  readonly showAdminSection = computed(() => {
    const perms = this.sessionService.permissions();
    if (!perms) return false;
    return !!(
      perms.manageUsers ||
      perms.manageRooms ||
      perms.manageBookings ||
      perms.manageRoles ||
      perms.manageAssets ||
      perms.manageClasses ||
      perms.manageCampuses
    );
  });

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  async logout() {
    const confirmed = await this.confirmService.standard('Vill du logga ut?', 'Logga ut');
    if (!confirmed) return;
    this.layoutService.closeSidebar();
    await this.authService.logout();
  }
}
