/**
 * Kevin Ortiz Experience/Skills Page Component
 *
 * Displays Kevin's technical skills organized by category (Languages,
 * Frameworks, Database/Tools, Testing, DevOps, General). Skills are
 * displayed in a grid layout with checkmark icons, grouped into pairs
 * of categories for side-by-side display.
 *
 * Route: /kevin/experience
 */

import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';

/**
 * Interface for a skill category containing a title and list of skill names.
 */
interface SkillCategory {
  title: string;
  skills: string[];
}

@Component({
  selector: 'app-home',
  imports: [KevinNavigationComponent, KevinFooterComponent, NgFor],
  template: `
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
  `,
  styleUrls: ['./experience.component.scss', '../global/global.component.scss'],
})
export class KevinExperienceComponent {
  /** Array of skill categories with their respective skills. */
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

  /**
   * Groups skill categories into pairs for side-by-side layout display.
   * For example, 6 categories become 3 pairs of 2 categories each.
   *
   * @returns Array of SkillCategory arrays, each containing up to 2 categories.
   */
  get skillCategoriesPairs(): SkillCategory[][] {
    const pairs = [];
    for (let i = 0; i < this.skillCategories.length; i += 2) {
      pairs.push(this.skillCategories.slice(i, i + 2));
    }
    return pairs;
  }
}
