import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Experience } from '../global/kevin-data';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section section-alt" id="work">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">02 · Work history</span>
          <h2 class="section-title">Where I've shipped.</h2>
          <p class="section-sub">
            Roles, achievements, and the stack I used at each. Recruiter-ready:
            dates, durations, and outcomes up front.
          </p>
        </div>
        <div class="timeline">
          <div *ngFor="let e of experience" class="tl-item" [class.is-current]="e.current">
            <span class="tl-dot"></span>
            <div class="tl-meta">
              <span>{{ e.period }}</span>
              <span *ngIf="e.current" class="badge">Now</span>
              <span class="duration">· {{ e.duration }}</span>
            </div>
            <h3 class="tl-role">{{ e.role }}</h3>
            <div class="tl-company">{{ e.company }}</div>
            <ul class="tl-points">
              <li *ngFor="let p of e.points">{{ p }}</li>
            </ul>
            <div class="tl-stack">
              <span *ngFor="let s of e.stack" class="chip">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent {
  @Input({ required: true }) experience!: Experience[];
}
