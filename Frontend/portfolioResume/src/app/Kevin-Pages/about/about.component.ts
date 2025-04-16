import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
@Component({
  selector: 'app-home',
  imports: [KevinNavigationComponent, KevinFooterComponent],
  template: `
    <head>
      <title>Kevin's portfolio project</title>
    </head>
    <body>
      <app-navigation></app-navigation>
      <section id="about">
        <div class="about-section-container">
          <div class="about-section-picture-container">
            <img
              src="./assets/professional-picture.jpg"
              alt="profile picture"
              class="about-picture"
            />
          </div>
          <div class="about-details-container">
            <div class="about-containers">
              <div class="details-container">
                <img
                  src="./assets/experience.png"
                  alt="Experience icon"
                  class="icon"
                />
                <h3 class="Experience-tag">Experience</h3>
                <p class="first-experience-paragraph">
                  3 + years
                  Software Developer
                </p><br />
                <p class="second-experience-paragraph">
                  2 + years
                  Quality Assurance Engineer
                </p><br />

                <p class="third-experience-paragraph">
                  3 + months
                  DevOps Engineer
                </p>
              </div>

              <div class="details-container">
                <img
                  src="./assets/education.png"
                  alt="Education icon"
                  class="icon"
                />
                <h3 class="Education-tag">Education</h3>
                <p class = "first-education-paragraph">B.Sc. in Marine Environmental Science</p> <br />
                <p class = "second-education-paragraph">Software Engineering training at Perscholas</p> <br />
                <p class = "third-education-paragraph">Quality Assurance training at FDM Group</p>
              </div>
            </div>
            <div class="text-container">
              <p class = "about-me-paragraph-one" >
                I am a dynamic and detail-oriented Quality Assurance Engineer
                with a robust background in software testing, DevOps, cloud
                infrastructure, and full-stack development. With experience
                leading QA teams and collaborating across cross-functional Agile
                environments, I bring a proven ability to drive quality and
                efficiency in both manual and automated testing.
              </p>
              <br>
              <p class = "about-me-paragraph-two">
                I have hands-on experience with Selenium, Playwright, TestNG,
                Cucumber, and a variety of DevOps tools, including Docker,
                Kubernetes, Terraform, Jenkins, and Azure. I have demonstrated
                expertise in orchestrating containerized applications, building
                resilient cloud solutions, and automating infrastructure
                deployment. My QA leadership at FDM Group and analytical
                contributions at TD Bank reflect my strong technical insight and
                effective communication skills.
              </p>
              <br>
              <p class = "about-me-paragraph-three">
                As a U.S. Navy veteran and a SUNY Maritime graduate, I bring a
                solid foundation in leadership, discipline, and teamwork. With
                continuous upskilling in Salesforce, Java, Python, React, and
                mobile/app testing platforms, I remain committed to innovation
                and excellence in software quality engineering.
              </p>
            </div>
          </div>
        </div>
      </section>
      <app-footer></app-footer>
    </body>
  `,
  styleUrls: ['./about.component.scss', '../global/global.component.scss'],
})
export class KevinAboutComponent {}
