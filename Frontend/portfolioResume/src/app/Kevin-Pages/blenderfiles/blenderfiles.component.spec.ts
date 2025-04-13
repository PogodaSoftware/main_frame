import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { KevinBlenderFilesComponent } from './blenderfiles.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('KevinBlenderFilesComponent', () => {
  let component: KevinBlenderFilesComponent;
  let fixture: ComponentFixture<KevinBlenderFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KevinBlenderFilesComponent],
      imports: [HttpClientTestingModule], // Mock HTTP requests
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
    fixture.detectChanges(); // Trigger change detection
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});