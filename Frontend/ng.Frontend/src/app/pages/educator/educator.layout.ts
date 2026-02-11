import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-educator-layout',
  imports: [HeaderComponent],
  templateUrl: './educator.layout.html',
  styleUrl: './educator.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EducatorLayout {
  // TODO: Fixa bokningspanelen med korten så de har rätt layout i teacher-layout
  // TODO: Implementera en kalender-komponent för lärare
}
