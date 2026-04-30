/**
 * KevinHomeComponent
 * ------------------
 * Single-page portfolio composition. Hero · Marquee · About ·
 * Timeline · Skills · Projects · Contact stacked under a sticky nav
 * with scroll-spy. Theme + variant signals from KevinThemeService.
 *
 * Selected Works are glTF-only; until .glb files ship, project thumbs
 * fall back to a striped accent placeholder.
 *
 * Route: /kevin
 */

import {
  AfterViewInit,
  Component,
  HostListener,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
import { Hero3dComponent } from '../hero3d/hero3d.component';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { MarqueeComponent } from '../marquee/marquee.component';
import { TimelineComponent } from '../timeline/timeline.component';
import { SkillsComponent } from '../skills/skills.component';
import { KevinGlobalService } from '../global/global.service';
import {
  EXPERIENCE,
  PROFILE,
  PROJECTS,
  SKILL_GROUPS,
  Project,
} from '../global/kevin-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, KevinNavigationComponent, KevinFooterComponent, Hero3dComponent, ProjectCardComponent, MarqueeComponent, TimelineComponent, SkillsComponent],
  template: `
    <app-navigation [active]="active()" (navigate)="onNav($event)"></app-navigation>

    <!-- HERO -->
    <section class="hero" id="top">
      <div class="shell hero-grid">
        <div class="hero-copy fade-in">
          <div class="hero-eyebrow">
            <span class="dot"></span>
            <span>Available for new roles · {{ profile.location }}</span>
          </div>
          <h1>
            Engineering<br/>
            <em>reliable</em> systems<br/>
            and <em>3D</em> worlds.
          </h1>
          <p class="hero-sub">
            I'm <strong>{{ profile.name }}</strong> — a QA &amp; DevOps engineer with a
            software development backbone. By day I ship resilient cloud
            infrastructure and lead test automation. By night I model and
            render in Blender.
          </p>
          <div class="hero-meta">
            <span class="hero-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {{ profile.location }}
            </span>
            <span class="hero-meta-item">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 13.5 9.5 21 11 13.5 12.5 12 20 10.5 12.5 3 11 10.5 9.5z"/></svg>
              5+ years engineering
            </span>
            <span class="hero-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>
              U.S. Navy Veteran
            </span>
          </div>
          <div class="hero-cta-row">
            <button type="button" class="btn btn-accent" (click)="downloadCv()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>
              </svg>
              Download CV
            </button>
            <button type="button" class="btn btn-ghost" (click)="onNav('projects')">
              See projects
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
            </button>
          </div>
        </div>
        <div class="hero-stage" aria-label="Featured 3D piece">
          <app-hero3d
            [projectIndex]="projectIndex()"
            [projects]="projects"
            [autoRotate]="autoRotate()"
            class="stage-fallback"
          ></app-hero3d>
          <div class="stage-controls">
            <button
              type="button"
              class="icon-btn"
              (click)="autoRotate.set(!autoRotate())"
              [attr.aria-label]="autoRotate() ? 'Pause rotation' : 'Play rotation'"
            >
              <svg *ngIf="autoRotate()" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              <svg *ngIf="!autoRotate()" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </button>
          </div>
          <div class="hero-stage-overlay">
            <div class="stage-tag">
              <span class="lbl">Now showing</span>
              <span>{{ currentProject().name }} · {{ currentProject().tag }}</span>
            </div>
            <div class="stage-dots">
              <button
                *ngFor="let p of projects; let i = index"
                type="button"
                class="stage-dot"
                [class.is-active]="i === projectIndex()"
                (click)="projectIndex.set(i)"
                [attr.aria-label]="'Show ' + p.name"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MARQUEE -->
    <app-marquee></app-marquee>

    <!-- ABOUT -->
    <section class="section" id="about">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">01 · About</span>
          <h2 class="section-title">A builder with a tester's eye and a designer's hand.</h2>
        </div>
        <div class="about-grid">
          <div class="about-portrait">
            <div class="placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
              </svg>
            </div>
            <div class="about-stats">
              <div *ngFor="let s of profile.stats" class="about-stat">
                <div class="v">{{ s.v }}</div>
                <div class="l">{{ s.l }}</div>
              </div>
            </div>
          </div>
          <div class="about-body">
            <p *ngFor="let para of profile.bioLong">{{ para }}</p>
            <div class="about-tags">
              <span class="tag"><span class="star">✦</span> QA Lead</span>
              <span class="tag"><span class="star">✦</span> DevOps</span>
              <span class="tag"><span class="star">✦</span> Full-stack</span>
              <span class="tag"><span class="star">✦</span> 3D / WebGL</span>
              <span class="tag"><span class="star">✦</span> Mentor</span>
            </div>
            <div class="about-quick">
              <div *ngFor="let q of profile.quick" class="about-quick-cell">
                <div class="lbl">{{ q.lbl }}</div>
                <div class="val">{{ q.val }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <app-timeline [experience]="experience"></app-timeline>

    <app-skills [skillGroups]="skillGroups"></app-skills>

    <!-- PROJECTS -->
    <section class="section section-alt" id="projects">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">04 · Projects</span>
          <h2 class="section-title">Selected work.</h2>
        </div>
        <div class="projects-grid">
          <app-project-card *ngFor="let p of projects" [project]="p"></app-project-card>
        </div>
      </div>
    </section>

    <!-- CONTACT -->
    <section class="section" id="contact">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">05 · Contact</span>
        </div>
        <div class="contact-grid">
          <div>
            <h2 class="contact-cta">Let's build something <em>worth shipping.</em></h2>
            <p class="contact-lede">
              Open to full-time and contract roles in QA, DevOps, and full-stack engineering.
              Quickest reply is over email.
            </p>
          </div>
          <div class="contact-cards">
            <a class="contact-card" [href]="'mailto:' + profile.email">
              <span class="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              </span>
              <span class="contact-card-body">
                <span class="lbl">Email</span>
                <span class="val">{{ profile.email }}</span>
              </span>
              <span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></span>
            </a>
            <a class="contact-card" [href]="'https://linkedin.com/in/' + profile.linkedin" target="_blank" rel="noopener">
              <span class="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </span>
              <span class="contact-card-body">
                <span class="lbl">LinkedIn</span>
                <span class="val">linkedin.com/in/{{ profile.linkedin }}</span>
              </span>
              <span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></span>
            </a>
            <a class="contact-card" [href]="'https://github.com/' + profile.github" target="_blank" rel="noopener">
              <span class="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              </span>
              <span class="contact-card-body">
                <span class="lbl">GitHub</span>
                <span class="val">github.com/{{ profile.github }}</span>
              </span>
              <span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <app-footer></app-footer>
  `,
  styleUrls: ['./home.component.scss', '../global/global.component.scss'],
})
export class KevinHomeComponent implements AfterViewInit, OnDestroy {
  readonly profile = PROFILE;
  readonly experience = EXPERIENCE;
  readonly skillGroups = SKILL_GROUPS;
  readonly projects = PROJECTS;

  readonly active = signal<string>('top');
  readonly projectIndex = signal<number>(0);
  readonly autoRotate = signal<boolean>(true);

  private observer: IntersectionObserver | null = null;
  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private global: KevinGlobalService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    const ids = ['about', 'work', 'skills', 'projects', 'contact'];
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.active.set(e.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.observer.observe(el);
    }
    this.startRotateTimer();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.rotateTimer != null) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (window.scrollY < 80) this.active.set('top');
  }

  currentProject(): Project {
    return this.projects[this.projectIndex()] || this.projects[0];
  }

  onNav(id: string): void {
    if (!this.isBrowser) return;
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.active.set('top');
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  downloadCv(): void {
    this.global.openPage('./assets/Kevin_Ortiz_Resume_Developer.pdf');
  }

  private startRotateTimer(): void {
    if (!this.isBrowser) return;
    this.rotateTimer = setInterval(() => {
      if (!this.autoRotate()) return;
      this.projectIndex.update((i) => (i + 1) % this.projects.length);
    }, 5000);
  }
}
