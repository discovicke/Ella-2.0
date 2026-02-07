import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdministratorLayout } from './administrator.layout';

describe('AdministratorLayout', () => {
  let component: AdministratorLayout;
  let fixture: ComponentFixture<AdministratorLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministratorLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(AdministratorLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
