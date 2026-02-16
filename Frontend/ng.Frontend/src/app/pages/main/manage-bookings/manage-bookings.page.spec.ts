import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageBookingsPage } from './manage-bookings.page';

describe('ManageBookingsPage', () => {
  let component: ManageBookingsPage;
  let fixture: ComponentFixture<ManageBookingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageBookingsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageBookingsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
