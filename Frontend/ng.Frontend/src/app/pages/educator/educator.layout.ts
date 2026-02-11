import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-educator-layout',
  imports: [HeaderComponent],
  templateUrl: './educator.layout.html',
  styleUrl: './educator.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EducatorLayout {}
