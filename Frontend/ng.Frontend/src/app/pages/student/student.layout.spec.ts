import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentLayout } from './student.layout';

describe('StudentLayout', () => {
  let component: StudentLayout;
  let fixture: ComponentFixture<StudentLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
