# Portfolio Resume Application

## Overview
This is a full-stack portfolio and resume application featuring:
- **Frontend**: Angular 19 application with Server-Side Rendering (SSR)
- **Backend**: Django 5.1.5 REST API (currently minimal setup)
- **Testing**: Playwright-based end-to-end testing suite

The application showcases Kevin Ortiz's portfolio as a Quality Assurance & DevOps Engineer, with sections for About, Experience, Projects, and Contact information.

## Project Structure
```
.
├── Frontend/portfolioResume/     # Angular 19 frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── Kevin-Pages/      # Main portfolio pages
│   │   │   └── Pogoda-Software-Pages/
│   │   └── assets/               # Static assets
│   ├── angular.json              # Angular configuration
│   └── package.json              # Frontend dependencies
├── Backend/controller/           # Django backend
│   ├── main_frame_project/
│   ├── requirements.txt          # Python dependencies
│   └── manage.py
└── Playwright/                   # E2E test suite
    ├── features/                 # BDD feature files
    ├── pages/                    # Page object models
    └── steps/                    # Test step definitions
```

## Development Setup

### Frontend (Angular)
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 (allows Replit proxy access)
- **Start Command**: `npm start` (from Frontend/portfolioResume directory)
- **Technologies**: Angular 19, TypeScript, SCSS, Three.js
- **Features**:
  - Server-Side Rendering (SSR)
  - Multiple themed pages (Kevin's portfolio, Pogoda Software)
  - Responsive navigation and footer components
  - Contact forms and project showcases

### Backend (Django)
- **Port**: Not currently configured (backend is minimal setup)
- **Start Command**: `python manage.py runserver` (from Backend/controller directory)
- **Technologies**: Django 5.1.5, SQLite, Gunicorn
- **Status**: Basic Django project setup, ready for API development

### Testing
- **Framework**: Playwright with pytest-bdd
- **Test Types**: BDD (Behavior-Driven Development) with Gherkin feature files
- **Coverage**: Home page, About, Experience, Projects, Contact pages

## Replit Configuration

### Workflow
The project uses a single workflow for the frontend:
- **Name**: `frontend`
- **Command**: `cd Frontend/portfolioResume && npm start`
- **Output**: Webview on port 5000
- **Status**: Running

### Angular Configuration
The Angular dev server is configured in `angular.json` to work with Replit's proxy:
- Port: 5000
- Host: 0.0.0.0
- The newer Angular application builder handles host checking automatically when bound to 0.0.0.0

### Routes
- `/` - Redirects to `/kevin` (home page)
- `/kevin` - Kevin Ortiz portfolio home
- `/kevin/about` - About page
- `/kevin/experience` - Experience page
- `/kevin/projects` - Projects showcase
- `/kevin/contacts` - Contact form
- `/kevin/blender-projects` - Blender projects showcase
- `/pogoda` - Pogoda Software page

## Deployment
Configured for Replit autoscale deployment:
- **Build**: Installs dependencies and builds Angular production bundle
- **Run**: Serves static files using `serve` on port 5000
- **Type**: Autoscale (stateless, scales based on traffic)

## Recent Changes
- **2025-11-06**: Initial Replit setup
  - Installed Node.js 20 and Python 3.11
  - Configured Angular to run on port 5000 with host 0.0.0.0
  - Added default route redirect from `/` to `/kevin`
  - Set up frontend workflow
  - Configured deployment settings
  - Updated .gitignore for Angular build artifacts

## Known Issues
- Backend is not currently running (minimal setup only)
- WebGL/Three.js features may not work in Replit's browser preview due to lack of WebGL context support in the iframe environment. These features will work when deployed or accessed directly via the public URL.

## Future Enhancements
- Connect frontend to Django backend API
- Implement backend endpoints for contact forms and data management
- Set up database for dynamic content
- Deploy backend alongside frontend
