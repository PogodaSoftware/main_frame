import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlenderfilesComponent } from './blenderfiles.component';

describe('BlenderfilesComponent', () => {
  let component: BlenderfilesComponent;
  let fixture: ComponentFixture<BlenderfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlenderfilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlenderfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
