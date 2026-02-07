import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-login-page',
  imports: [],
  templateUrl: './login.layout.html',
  styleUrl: './login.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
