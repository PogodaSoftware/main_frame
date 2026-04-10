import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-beauty-wireframe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wireframe-wrapper" [innerHTML]="wireframeContent"></div>
  `,
  styles: [`
    .wireframe-wrapper {
      width: 100%;
      min-height: 100vh;
    }
  `]
})
export class BeautyWireframeComponent implements OnInit {
  wireframeContent!: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    const html = `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .mermaid { background: transparent; }
        .diagram-container { margin-bottom: 40px; }
        .diagram-title { font-size: 1.2rem; font-weight: 600; color: #555; margin-bottom: 15px; }
        .component-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .component-details h3 { color: #333; margin-bottom: 15px; }
        .component-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .component-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .component-item h4 { color: #333; margin-bottom: 8px; }
        .component-item p { color: #666; font-size: 0.9rem; margin: 0; }
        .code-snippet {
          background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 6px;
          font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9rem;
          overflow-x: auto; margin: 10px 0; white-space: pre;
        }
      </style>

      <div class="container">
        <h1>Beauty Pages Wireframe - Angular Architecture</h1>

        <div class="diagram-container">
          <div class="diagram-title">Component Architecture</div>
          <div class="mermaid">
graph TD
    A[BeautyShellComponent] --> B[BeautyMainComponent]
    A --> C[BeautyLoginComponent]
    A --> D[BeautySignupComponent]
    A --> E[BeautyBusinessLoginComponent]
    B --> F[Service Categories]
    B --> G[Google Maps]
    B --> H[Header Actions]
    C --> I[Email/Password Form]
    C --> J[Form Validation]
    C --> K[Navigation]
    D --> L[Signup Form]
    D --> M[Form Validation]
    D --> N[Navigation]
    E --> O[Business Login Form]
    E --> P[Form Validation]
    E --> Q[Navigation]
    subgraph Services
        F --> F1[Facial Treatments]
        F --> F2[Massage Therapy]
        F --> F3[Nail Services]
        F --> F4[Hair Styling]
    end
    subgraph Authentication
        I --> I1[Email Input]
        I --> I2[Password Input]
        I --> I3[Toggle Password]
    end
          </div>
        </div>

        <div class="diagram-container">
          <div class="diagram-title">Data Flow</div>
          <div class="mermaid">
sequenceDiagram
    participant User
    participant BeautyShell
    participant BFF Service
    participant Component
    User->>BeautyShell: Navigate to /beauty
    BeautyShell->>BFF Service: POST /resolve
    BFF Service->>BeautyShell: Response (render/redirect)
    BeautyShell->>Component: Render with @Input(data)
    Component->>User: Display UI
    User->>Component: Event (click/form submit)
    Component->>BeautyShell: @Output(event)
    BeautyShell->>BFF Service: POST /resolve
    BFF Service->>BeautyShell: New response
    BeautyShell->>Component: Update view
          </div>
        </div>

        <div class="component-details">
          <h3>Component Breakdown</h3>
          <div class="component-list">
            <div class="component-item">
              <h4>BeautyShellComponent</h4>
              <p>Master container that routes between different beauty screens based on BFF response. Handles loading states and errors.</p>
            </div>
            <div class="component-item">
              <h4>BeautyMainComponent</h4>
              <p>Home screen displaying service categories and Google Maps integration. Shows user authentication status.</p>
            </div>
            <div class="component-item">
              <h4>BeautyLoginComponent</h4>
              <p>Customer login form with email/password validation. Emits login success events.</p>
            </div>
            <div class="component-item">
              <h4>BeautySignupComponent</h4>
              <p>Customer registration form with similar validation to login.</p>
            </div>
            <div class="component-item">
              <h4>BeautyBusinessLoginComponent</h4>
              <p>Business account login form, separate from customer login.</p>
            </div>
          </div>
        </div>

        <div class="component-details">
          <h3>Key Architecture Points</h3>
          <div class="component-list">
            <div class="component-item">
              <h4>SDUI Pattern</h4>
              <p>Server-Driven UI — the BFF decides which component to render.</p>
            </div>
            <div class="component-item">
              <h4>Component Isolation</h4>
              <p>Each component is standalone with no client-side state management.</p>
            </div>
            <div class="component-item">
              <h4>Data Flow</h4>
              <p>Data flows through @Input() and events through @Output().</p>
            </div>
            <div class="component-item">
              <h4>Mobile First</h4>
              <p>Optimized for mobile with responsive breakpoints.</p>
            </div>
          </div>
        </div>

        <div class="component-details">
          <h3>Sample Code Structure</h3>
          <div class="code-snippet">// Shell Component Template
@switch (bffResponse?.screen) {
  @case ('beauty_home') {
    &lt;app-beauty-main
      [data]="bffResponse!.data"
      (navigate)="navigateTo($event)"
    /&gt;
  }
  @case ('beauty_login') {
    &lt;app-beauty-login
      [data]="bffResponse!.data"
      (loginSuccess)="handleAuthSuccess()"
    /&gt;
  }
}</div>
        </div>
      </div>

      <script>
        if (typeof mermaid !== 'undefined') {
          mermaid.initialize({ startOnLoad: true, theme: 'default' });
        } else {
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          s.onload = function() { mermaid.initialize({ startOnLoad: true }); mermaid.init(); };
          document.head.appendChild(s);
        }
      </script>
    `;

    this.wireframeContent = this.sanitizer.bypassSecurityTrustHtml(html);
  }
}