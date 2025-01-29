import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinProjectsComponent } from './projects.component';

describe('KevinProjectsComponent', () => {
  let component: KevinProjectsComponent;
  let fixture: ComponentFixture<KevinProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinProjectsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KevinProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
