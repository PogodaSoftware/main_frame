/**
 * BeautyMainComponent (Presentational)
 * -------------------------------------
 * Renders the Beauty home screen using data passed from the shell.
 * Owns no state — everything comes from [data] @Input().
 * Emits (navigate) and (logout) events; the shell handles routing.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

declare const google: any;

interface ServiceCategory {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-beauty-main',
  standalone: true,
  imports: [],
  template: `
    <div class="beauty-app">
      <!-- Header -->
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="navigate.emit('beauty_home')">Beauty</button>
        </div>
        <div class="header-actions">
          @if (!isAuthenticated) {
            <button class="btn-login" (click)="navigate.emit('beauty_login')">Sign in</button>
            <button class="btn-signup" (click)="navigate.emit('beauty_signup')">Sign up</button>
          } @else {
            <div class="user-email-badge">{{ userEmail }}</div>
            <button class="btn-logout" (click)="logout.emit()">Sign out</button>
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
        @if (!googleMapsKeyPresent) {
          <div class="map-placeholder">
            <div class="map-placeholder-content">
              <span class="map-placeholder-icon">🗺️</span>
              <p>Map coming soon</p>
              <small>Add GOOGLE_MAPS_API_KEY to enable the map</small>
            </div>
          </div>
        }
        <div #mapContainer class="map-container" [class.hidden]="!googleMapsKeyPresent"></div>
      </section>
    </div>
  `,
  styleUrls: ['./beauty-main.component.scss'],
})
export class BeautyMainComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() data: Record<string, unknown> = {};
  @Output() navigate = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();

  isAuthenticated = false;
  userEmail: string | null = null;
  googleMapsKeyPresent = false;
  services: ServiceCategory[] = [];

  private map: any = null;
  private scriptEl: HTMLScriptElement | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnChanges(): void {
    this.isAuthenticated = Boolean(this.data['is_authenticated']);
    this.userEmail = (this.data['user_email'] as string) || null;
    this.googleMapsKeyPresent = Boolean(this.data['google_maps_key_present']);
    this.services = (this.data['services'] as ServiceCategory[]) || [];
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.googleMapsKeyPresent) {
      this.loadGoogleMapsScript();
    }
  }

  ngOnDestroy(): void {
    if (this.scriptEl?.parentNode) {
      this.scriptEl.parentNode.removeChild(this.scriptEl);
    }
  }

  private loadGoogleMapsScript(): void {
    const existing = this.document.querySelector('#google-maps-script') as HTMLScriptElement | null;
    if (existing) {
      if (typeof google !== 'undefined') {
        this.initMap();
      } else {
        existing.addEventListener('load', () => this.initMap(), { once: true });
      }
      return;
    }

    const mapsKey = (this.data['google_maps_key'] as string) || '';
    const script = this.document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.initMap();
    this.scriptEl = script;
    this.document.head.appendChild(script);
  }

  private initMap(): void {
    if (typeof google === 'undefined' || !this.mapContainer?.nativeElement) return;
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 13,
      disableDefaultUI: false,
      gestureHandling: 'greedy',
    });
  }
}
