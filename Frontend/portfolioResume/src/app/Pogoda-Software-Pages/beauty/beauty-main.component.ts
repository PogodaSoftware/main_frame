import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

declare const google: any;

interface ServiceCategory {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-beauty-main',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="beauty-app">
      <!-- Header -->
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <a class="brand-name" routerLink="/pogoda/beauty">Beauty</a>
        </div>
        <div class="header-actions">
          @if (!userEmail) {
            <button class="btn-signup" (click)="goToSignUp()">Sign up</button>
          } @else {
            <div class="user-email-badge">{{ userEmail }}</div>
          }
        </div>
      </header>

      <!-- Service Categories -->
      <section class="services-section">
        <div class="services-scroll">
          @for (service of services; track service.label) {
            <div class="service-item">
              <div class="service-icon">{{ service.icon }}</div>
              <span class="service-label">{{ service.label }}</span>
            </div>
          }
        </div>
      </section>

      <!-- Google Maps -->
      <section class="map-section">
        @if (!mapApiKey) {
          <div class="map-placeholder">
            <div class="map-placeholder-content">
              <span class="map-placeholder-icon">🗺️</span>
              <p>Map coming soon</p>
              <small>Add GOOGLE_MAPS_API_KEY to enable the map</small>
            </div>
          </div>
        }
        <div #mapContainer class="map-container" [class.hidden]="!mapApiKey"></div>
      </section>
    </div>
  `,
  styleUrls: ['./beauty-main.component.scss'],
})
export class BeautyMainComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  userEmail: string | null = null;
  mapApiKey = environment.googleMapsApiKey;
  private map: any = null;
  private scriptEl: HTMLScriptElement | null = null;

  services: ServiceCategory[] = [
    { icon: '💄', label: 'Beauty' },
    { icon: '👁️', label: 'Lashes' },
    { icon: '💅', label: 'Nails' },
    { icon: '💋', label: 'Makeup' },
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userEmail = localStorage.getItem('beautyUserEmail');
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.mapApiKey) {
      this.loadGoogleMapsScript();
    }
  }

  ngOnDestroy(): void {
    if (this.scriptEl && this.scriptEl.parentNode) {
      this.scriptEl.parentNode.removeChild(this.scriptEl);
    }
  }

  goToSignUp(): void {
    this.router.navigate(['/pogoda/beauty/signup']);
  }

  private loadGoogleMapsScript(): void {
    const existingScript = this.document.querySelector('#google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      if (typeof google !== 'undefined') {
        this.initMap();
      } else {
        existingScript.addEventListener('load', () => this.initMap(), { once: true });
      }
      return;
    }

    const script = this.document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.mapApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.initMap();
    this.scriptEl = script;
    this.document.head.appendChild(script);
  }

  private initMap(): void {
    if (typeof google === 'undefined' || !this.mapContainer?.nativeElement) {
      return;
    }
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 13,
      disableDefaultUI: false,
      gestureHandling: 'greedy',
    });
  }
}
