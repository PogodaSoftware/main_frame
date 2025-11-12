import { Component } from '@angular/core';
import { PogodaNavigationComponent } from '../navigation/navigation.component';
import { PogodaFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';

interface Experience {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string[];
  technologies?: string[];
}

interface Education {
  institution: string;
  degree: string;
  period: string;
  location: string;
}

@Component({
  selector: 'app-pogoda-experience',
  standalone: true,
  imports: [PogodaNavigationComponent, PogodaFooterComponent, NgFor],
  template: `
    <head>
      <title>Jaroslaw Pogoda - Professional Experience</title>
    </head>
    <body>
      <app-pogoda-navigation></app-pogoda-navigation>
      
      <section id="experience">
        <h1 class="title">Professional Experience</h1>
        
        <div class="timeline-container">
          <div class="experience-item" *ngFor="let exp of experiences">
            <div class="timeline-marker"></div>
            <div class="experience-card">
              <h2 class="role-title">{{ exp.role }}</h2>
              <h3 class="company-name">{{ exp.company }}</h3>
              <p class="period">{{ exp.period }} | {{ exp.location }}</p>
              <ul class="responsibilities">
                <li *ngFor="let item of exp.description">{{ item }}</li>
              </ul>
              @if (exp.technologies && exp.technologies.length > 0) {
                <div class="technologies">
                  <strong>Technologies:</strong>
                  <span class="tech-tag" *ngFor="let tech of exp.technologies">{{ tech }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <h1 class="title education-title">Education</h1>
        <div class="education-container">
          <div class="education-item" *ngFor="let edu of education">
            <img src="./assets/education.png" alt="Education icon" class="icon" />
            <div class="education-details">
              <h3>{{ edu.degree }}</h3>
              <p class="institution">{{ edu.institution }}</p>
              <p class="period">{{ edu.period }} | {{ edu.location }}</p>
            </div>
          </div>
        </div>
      </section>
      
      <app-pogoda-footer></app-pogoda-footer>
    </body>
  `,
  styleUrls: ['./experience.component.scss', '../../Kevin-Pages/global/global.component.scss'],
})
export class PogodaExperienceComponent {
  experiences: Experience[] = [
    {
      company: 'Company Name',
      role: 'Senior Position Title',
      period: 'Month YYYY - Present',
      location: 'City, Country',
      description: [
        'Key responsibility or achievement description',
        'Another major contribution or project leadership role',
        'Technical implementation or process improvement',
        'Team collaboration or mentorship activity'
      ],
      technologies: ['Technology 1', 'Technology 2', 'Technology 3', 'Technology 4']
    },
    {
      company: 'Previous Company',
      role: 'Position Title',
      period: 'Month YYYY - Month YYYY',
      location: 'City, Country',
      description: [
        'Primary responsibility or project',
        'Achievement or contribution',
        'Technical work or implementation',
        'Cross-functional collaboration'
      ],
      technologies: ['Tech A', 'Tech B', 'Tech C']
    }
  ];

  education: Education[] = [
    {
      institution: 'University Name',
      degree: 'Degree Type in Field of Study',
      period: 'YYYY - YYYY',
      location: 'City, Country'
    }
  ];
}
