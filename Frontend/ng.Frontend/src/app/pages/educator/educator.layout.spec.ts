import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EducatorLayout } from './educator.layout';

describe('EducatorLayout', () => {
  let component: EducatorLayout;
  let fixture: ComponentFixture<EducatorLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducatorLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(EducatorLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
