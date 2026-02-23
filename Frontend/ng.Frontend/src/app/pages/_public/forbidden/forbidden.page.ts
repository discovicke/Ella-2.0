import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-forbidden-page',
  imports: [],
  templateUrl: './forbidden.page.html',
  styleUrl: './forbidden.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}
