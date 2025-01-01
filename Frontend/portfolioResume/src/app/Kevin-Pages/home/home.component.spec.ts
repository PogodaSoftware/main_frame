import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinHomeComponent } from './home.component';

describe('KevinHomeComponent', () => {
  let component: KevinHomeComponent;
  let fixture: ComponentFixture<KevinHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinHomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KevinHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
