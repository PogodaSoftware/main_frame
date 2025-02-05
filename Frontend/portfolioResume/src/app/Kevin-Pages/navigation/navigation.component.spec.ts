import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinNavigationComponent } from './navigation.component';

describe('KevinNavigationComponent', () => {
  let component: KevinNavigationComponent;
  let fixture: ComponentFixture<KevinNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinNavigationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KevinNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
