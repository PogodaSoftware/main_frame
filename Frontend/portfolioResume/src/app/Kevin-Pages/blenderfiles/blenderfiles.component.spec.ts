import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { KevinBlenderFilesComponent } from './blenderfiles.component';

describe('KevinBlenderFilesComponent', () => {
  let component: KevinBlenderFilesComponent;
  let fixture: ComponentFixture<KevinBlenderFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KevinBlenderFilesComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({})
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KevinBlenderFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});