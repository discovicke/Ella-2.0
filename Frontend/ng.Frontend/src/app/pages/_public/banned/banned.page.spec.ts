import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannedPage } from './banned.page';

describe('BannedPage', () => {
  let component: BannedPage;
  let fixture: ComponentFixture<BannedPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannedPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BannedPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
