import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinFooterComponent } from './footer.component';

describe('KevinFooterComponent', () => {
  let component: KevinFooterComponent;
  let fixture: ComponentFixture<KevinFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KevinFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
