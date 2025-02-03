import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
@Component({
  selector: 'app-home',
  imports: [KevinNavigationComponent, KevinFooterComponent],
  template: `
    <head>
      <title>Kevin's experience page</title>
    </head>
    <body>
      <app-navigation></app-navigation>
      <section id="experience">
        <p class="experience-text-p1"></p>
        <h1 class="title">Experience</h1>
        <div class="experience-details-containers">
          <div class="experience-containers">
            <div class="details-container">
              <h2 class="experience-sub-title">Languages</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>HTML5</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>CSS3</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>JavaScript</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>SQL</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Python</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Java</h3>
                  </div>
                </article>
              </div>
            </div>

            <div class="details-container">
              <h2 class="experience-sub-title">Frameworks</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Salesforce Admin</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>React</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>YAML</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Spring Framework</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Angular</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Salesforce Developer</h3>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience">
        <p class="experience-text-p1"></p>

        <div class="experience-details-containers">
          <div class="experience-containers">
            <div class="details-container">
              <h2 class="experience-sub-title">Database and Tools</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>MySQL</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>MongoDB</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Android Studio</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Azure</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Confluence</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>TensorFlow</h3>
                  </div>
                </article>
              </div>
            </div>

            <div class="details-container">
              <h2 class="experience-sub-title">Testing</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />

                  <div>
                    <h3>TestNG</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Appium Testing</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>JUnit</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Selenium</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Playwright</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>ADA Testing</h3>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience">
        <p class="experience-text-p1"></p>

        <div class="experience-details-containers">
          <div class="experience-containers">
            <div class="details-container">
              <h2 class="experience-sub-title">Dev-Ops</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>GitHub Actions</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Docker</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Kubernetes</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Unix</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Terraform</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Jira</h3>
                  </div>
                </article>
              </div>
            </div>

            <div class="details-container">
              <h2 class="experience-sub-title">General</h2>
              <div class="article-container">
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
              
                    <h3>Microsoft Office</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Hexawise</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>VBA for Excel</h3>
                  </div>
                </article>

                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Jenkins</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Browser Stack</h3>
                  </div>
                </article>
                <article>
                  <img
                    src="./assets/checkmark.png"
                    alt="Experience icon"
                    class="icon"
                  />
                  <div>
                    <h3>Salesforce Developer</h3>
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
export class KevinExperienceComponent {}
