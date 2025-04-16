import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';

interface SkillCategory {
  title: string;
  skills: string[];
}

@Component({
  selector: 'app-home',
  imports: [KevinNavigationComponent, KevinFooterComponent, NgFor],
  template: `
    <head>
      <title>Kevin's experience page</title>
    </head>
    <body>
      <app-navigation></app-navigation>
      
      <section id="experience">
        <h1 class="title">Experience</h1>
        
        <div class="experience-details-containers" *ngFor="let categoryPair of skillCategoriesPairs">
          <div class="experience-containers">
            <div class="details-container" *ngFor="let category of categoryPair">
              <h2 class="experience-sub-title">{{ category.title }}</h2>
              <div class="article-container">
                <article *ngFor="let skill of category.skills">
                  <img src="./assets/checkmark.png" alt="Experience icon" class="icon" />
                  <div>
                    <h3>{{ skill }}</h3>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <app-footer></app-footer>
    </body>
  `,
  styleUrls: ['./experience.component.scss', '../global/global.component.scss'],
})
export class KevinExperienceComponent {
  skillCategories: SkillCategory[] = [
    {
      title: 'Languages',
      skills: ['HTML5', 'CSS3', 'JavaScript', 'SQL', 'Python', 'Java']
    },
    {
      title: 'Frameworks',
      skills: ['Salesforce Admin', 'React', 'YAML', 'Spring Framework', 'Angular', 'Salesforce Developer']
    },
    {
      title: 'Database and Tools',
      skills: ['MySQL', 'MongoDB', 'Android Studio', 'Azure', 'Confluence', 'TensorFlow']
    },
    {
      title: 'Testing',
      skills: ['TestNG', 'Appium Testing', 'JUnit', 'Selenium', 'Playwright', 'ADA Testing']
    },
    {
      title: 'Dev-Ops',
      skills: ['GitHub Actions', 'Docker', 'Kubernetes', 'Unix', 'Terraform', 'Jira']
    },
    {
      title: 'General',
      skills: ['Microsoft Office', 'Hexawise', 'VBA for Excel', 'Jenkins', 'Browser Stack', 'Salesforce Developer']
    }
  ];

  // Group categories into pairs for layout
  get skillCategoriesPairs(): SkillCategory[][] {
    const pairs = [];
    for (let i = 0; i < this.skillCategories.length; i += 2) {
      pairs.push(this.skillCategories.slice(i, i + 2));
    }
    return pairs;
  }
}