import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-student-layout',
  imports: [],
  templateUrl: './student.layout.html',
  styleUrl: './student.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {}
