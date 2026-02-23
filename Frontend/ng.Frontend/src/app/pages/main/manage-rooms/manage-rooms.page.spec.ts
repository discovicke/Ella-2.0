import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRoomsPage } from './manage-rooms.page';

describe('ManageRoomsPage', () => {
  let component: ManageRoomsPage;
  let fixture: ComponentFixture<ManageRoomsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageRoomsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRoomsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
