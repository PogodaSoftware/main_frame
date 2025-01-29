import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinExperienceComponent } from './experience.component';

describe('KevinExperienceComponent', () => {
  let component: KevinExperienceComponent;
  let fixture: ComponentFixture<KevinExperienceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinExperienceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KevinExperienceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
