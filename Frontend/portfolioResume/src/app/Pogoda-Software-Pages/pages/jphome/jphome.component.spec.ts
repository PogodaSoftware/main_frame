import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JPHomeComponent } from './jphome.component';

describe('JPHomeComponent', () => {
  let component: JPHomeComponent;
  let fixture: ComponentFixture<JPHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JPHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JPHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
