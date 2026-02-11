import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';


@Component({
  selector: 'app-student-layout',
  imports: [CommonModule, ButtonComponent, HeaderComponent],
  templateUrl: './student.layout.html',
  styleUrl: './student.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {
  activeTab = signal<'upcoming' | 'history'>('upcoming');

  setActiveTab(tab: 'upcoming' | 'history') {
    this.activeTab.set(tab);
  }
}
