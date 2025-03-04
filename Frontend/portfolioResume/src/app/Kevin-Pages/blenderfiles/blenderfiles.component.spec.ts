import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KevinBlenderFilesComponent } from './blenderfiles.component';

describe('KevinBlenderFilesComponent', () => {
  let component: KevinBlenderFilesComponent;
  let fixture: ComponentFixture<KevinBlenderFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KevinBlenderFilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KevinBlenderFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
