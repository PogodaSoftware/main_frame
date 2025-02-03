import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinAboutComponent } from './about.component';

describe('KevinAboutComponent', () => {
  let component: KevinAboutComponent;
  let fixture: ComponentFixture<KevinAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KevinAboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
