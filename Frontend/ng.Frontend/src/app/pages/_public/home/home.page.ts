import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home.layout.html',
  styleUrl: './home.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
