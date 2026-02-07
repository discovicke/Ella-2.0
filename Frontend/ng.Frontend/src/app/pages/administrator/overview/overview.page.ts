import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-overview-page',
  imports: [],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {}
