import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinContactComponent } from './contact.component';

describe('KevinContactComponent', () => {
  let component: KevinContactComponent;
  let fixture: ComponentFixture<KevinContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinContactComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KevinContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
