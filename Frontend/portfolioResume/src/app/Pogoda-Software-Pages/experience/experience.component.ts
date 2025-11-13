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
      technologies: ['JavaScript', 'React', 'Node.js', 'API Development', 'Full Stack Development']
    },
    {
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
      technologies: ['JavaScript', 'HTML/CSS', 'Git', 'Software Engineering']
    },
    {
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
      technologies: ['Technical Support', 'Customer Service', 'Mobile Technology']
    },
    {
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
      technologies: ['Web Development', 'HTML', 'CSS', 'JavaScript', 'Entrepreneurship']
    },
    {
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
      technologies: ['Translation', 'Healthcare', 'Communication']
    },
    {
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
      technologies: ['IT Support', 'Hardware', 'Software', 'Troubleshooting', 'Networking']
    }
  ];

  education: Education[] = [
    {
      institution: 'Queens College',
      degree: 'Bachelor of Science in Computer Science',
      period: '2010 - 2016',
      location: 'Queens, New York'
    },
    {
      institution: 'Triplebyte',
      degree: 'Triplebyte Certified Software Engineer',
      period: '2022',
      location: 'Remote'
    }
  ];
}
