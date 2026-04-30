import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillGroup } from '../global/kevin-data';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section" id="skills">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">03 · Skills</span>
          <h2 class="section-title">Stack, depth, and years of practice.</h2>
          <p class="section-sub">
            Recruiter view — every tool with the years I've shipped it. Filter
            by discipline.
          </p>
        </div>
        <div class="skills-toolbar" role="tablist" aria-label="Filter skills">
          <button
            type="button"
            class="skill-filter"
            [class.is-active]="filter() === 'all'"
            (click)="filter.set('all')"
          >All <span class="count">{{ totalSkills() }}</span></button>
          <button
            *ngFor="let g of skillGroups"
            type="button"
            class="skill-filter"
            [class.is-active]="filter() === g.id"
            (click)="filter.set(g.id)"
          >{{ g.name }} <span class="count">{{ g.items.length }}</span></button>
        </div>
        <div class="skills-grid">
          <div *ngFor="let g of visibleSkills()" class="skill-card">
            <div class="skill-card-head">
              <div class="skill-card-title">{{ g.name }}</div>
              <div class="skill-card-meta">{{ g.items.length }} tools</div>
            </div>
            <div *ngFor="let it of g.items" class="skill-row">
              <span class="name">{{ it.name }}</span>
              <div class="bar"><div class="bar-fill" [style.width.%]="it.level * 100"></div></div>
              <span class="yrs">{{ it.years }}y</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./skills.component.scss']
})
export class SkillsComponent {
  @Input({ required: true }) skillGroups!: SkillGroup[];
  readonly totalSkills = () => this.skillGroups.reduce((n, g) => n + g.items.length, 0);
  readonly filter = signal<string>('all');
  
  visibleSkills = () => {
    const f = this.filter();
    return f === 'all' ? this.skillGroups : this.skillGroups.filter((g) => g.id === f);
  };
}
