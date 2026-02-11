import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-administrator-layout',
  imports: [RouterOutlet, RouterLink, HeaderComponent],
  templateUrl: './administrator.layout.html',
  styleUrl: './administrator.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministratorLayout {}
