import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUsersPage } from './manage-users.page';

describe('ManageUsersPage', () => {
  let component: ManageUsersPage;
  let fixture: ComponentFixture<ManageUsersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageUsersPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUsersPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
