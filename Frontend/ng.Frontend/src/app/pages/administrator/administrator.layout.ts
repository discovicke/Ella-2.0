import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-administrator-layout',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './administrator.layout.html',
  styleUrl: './administrator.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministratorLayout {}
