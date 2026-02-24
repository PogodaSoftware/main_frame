/**
 * Pogoda Experience Page Component
 *
 * Displays Jaroslaw Pogoda's professional work experience and education
 * in a timeline layout with technology tags. Data is dynamically loaded
 * from the PostgreSQL database via the Django REST API.
 *
 * SSR Strategy:
 *   - Constructor loads fallback (static) data immediately for server rendering.
 *   - ngOnInit checks if running in browser before making HTTP API calls.
 *   - If API calls fail, the component gracefully falls back to static data.
 *
 * Route: /pogoda/experience
 */

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PogodaNavigationComponent } from '../navigation/navigation.component';
import { PogodaFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';
import { PogodaApiService, Experience, Education } from '../services/pogoda-api.service';

@Component({
  selector: 'app-pogoda-experience',
  standalone: true,
  imports: [PogodaNavigationComponent, PogodaFooterComponent, NgFor],
  template: `
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
  `,
  styleUrls: ['./experience.component.scss', '../../Kevin-Pages/global/global.component.scss'],
})
export class PogodaExperienceComponent implements OnInit {
  /** Array of work experience entries displayed in the timeline. */
  experiences: Experience[] = [];

  /** Array of education entries displayed below the experience section. */
  education: Education[] = [];

  /** Loading state flag (true while API data is being fetched). */
  loading = true;

  /**
   * @param pogodaApiService - Service for fetching data from the backend API.
   * @param platformId - Angular platform identifier used to detect browser vs server.
   */
  constructor(
    private pogodaApiService: PogodaApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadFallbackExperiences();
    this.loadFallbackEducation();
  }

  /**
   * Lifecycle hook called after component initialization.
   * Only makes API calls when running in the browser to avoid
   * SSR issues (the backend isn't accessible during server rendering).
   */
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadExperiences();
      this.loadEducation();
    }
  }

  /**
   * Fetches work experience data from the Django REST API.
   * On success, replaces the fallback data with live database data.
   * On error, retains the fallback data and logs the error.
   */
  loadExperiences(): void {
    this.pogodaApiService.getExperiences().subscribe({
      next: (data) => {
        this.experiences = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading experiences:', err);
        this.loadFallbackExperiences();
        this.loading = false;
      }
    });
  }

  /**
   * Fetches education data from the Django REST API.
   * On success, replaces the fallback data with live database data.
   * On error, retains the fallback data and logs the error.
   */
  loadEducation(): void {
    this.pogodaApiService.getEducation().subscribe({
      next: (data) => {
        this.education = data;
      },
      error: (err) => {
        console.error('Error loading education:', err);
        this.loadFallbackEducation();
      }
    });
  }

  /**
   * Loads hardcoded fallback work experience data.
   * Used during SSR and as a safety net when the API is unavailable.
   * This data mirrors what is stored in the PostgreSQL database.
   */
  loadFallbackExperiences(): void {
    this.experiences = [
    {
      id: 1,
      company: 'Gesture',
      role: 'Full Stack Software Engineer - Level 1',
      period: '2022 - Present',
      location: 'New York, United States',
      description: [
        'Engineered the Shop Flow feature to guide users through product selection process',
        'Developed frontend interfaces and API integrations for real-world applications',
        'Built full-stack solutions combining frontend development with backend API control',
        'Contributed to product features enhancing user experience and business workflows'
      ],
      technologies: ['JavaScript', 'React', 'Node.js', 'API Development', 'Full Stack Development'],
      order: 0
    },
    {
      id: 2,
      company: 'Per Scholas',
      role: 'Software Engineer Learner',
      period: '2021',
      location: 'New York, United States',
      description: [
        'Completed intensive software engineering training program',
        'Gained hands-on experience in modern web development technologies',
        'Built practical projects demonstrating full-stack development skills',
        'Developed foundation in software engineering best practices'
      ],
      technologies: ['JavaScript', 'HTML/CSS', 'Git', 'Software Engineering'],
      order: 1
    },
    {
      id: 3,
      company: 'Sprint by WirelessRitz',
      role: 'Technician/Sales Representative',
      period: '2012',
      location: 'New York, United States',
      description: [
        'Provided technical support and troubleshooting for mobile devices',
        'Delivered customer service and product consultation',
        'Diagnosed and resolved hardware and software issues',
        'Managed sales operations and customer relationships'
      ],
      technologies: ['Technical Support', 'Customer Service', 'Mobile Technology'],
      order: 2
    },
    {
      id: 4,
      company: 'Azodio.com',
      role: 'Owner/Developer',
      period: '2011',
      location: 'New York, United States',
      description: [
        'Founded and developed web development company',
        'Created custom websites and web applications for clients',
        'Managed full project lifecycle from conception to deployment',
        'Built business operations and client relationships'
      ],
      technologies: ['Web Development', 'HTML', 'CSS', 'JavaScript', 'Entrepreneurship'],
      order: 3
    },
    {
      id: 5,
      company: 'Bellevue Hospital Center',
      role: 'Patient Translator',
      period: '2011',
      location: 'New York, United States',
      description: [
        'Provided medical translation services for patients',
        'Facilitated communication between healthcare providers and patients',
        'Ensured accurate interpretation of medical information',
        'Supported patient care through effective bilingual communication'
      ],
      technologies: ['Translation', 'Healthcare', 'Communication'],
      order: 4
    },
    {
      id: 6,
      company: 'Freelance',
      role: 'IT Support Specialist',
      period: '2005 - 2011',
      location: 'New York, United States',
      description: [
        'Started career providing freelance IT support services',
        'Troubleshot hardware and software issues for clients',
        'Maintained computer systems and networks',
        'Built strong foundation in technical problem-solving'
      ],
      technologies: ['IT Support', 'Hardware', 'Software', 'Troubleshooting', 'Networking'],
      order: 5
    }
  ];
  }

  /**
   * Loads hardcoded fallback education data.
   * Used during SSR and as a safety net when the API is unavailable.
   * This data mirrors what is stored in the PostgreSQL database.
   */
  loadFallbackEducation(): void {
    this.education = [
      {
        id: 1,
        institution: 'Queens College',
        degree: 'Bachelor of Science in Computer Science',
        period: '2010 - 2016',
        location: 'Queens, New York',
        order: 0
      },
      {
        id: 2,
        institution: 'Triplebyte',
        degree: 'Triplebyte Certified Software Engineer',
        period: '2022',
        location: 'Remote',
        order: 1
      }
    ];
  }
}
