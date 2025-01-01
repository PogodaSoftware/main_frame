import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PogodaHomeComponent } from './home.component';

describe('PogodaHomeComponent', () => {
  let component: PogodaHomeComponent;
  let fixture: ComponentFixture<PogodaHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PogodaHomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PogodaHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
