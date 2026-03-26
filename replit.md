# Portfolio Resume Application

## Recent Changes (November 13, 2025)
- **Pogoda Software - Complete Separation from Kevin's Portfolio**:
  - Removed all links to Kevin's portfolio from Pogoda navigation (desktop and mobile)
  - Removed "Kevin's Portfolio" button from Pogoda home page
  - Pogoda Software section now operates completely independently
  - Navigation shows only: Home and Experience
  
- **PostgreSQL Backend Integration for Pogoda Software**:
  - **Database**: Created PostgreSQL database with WorkExperience and Education models
  - **Django REST API**: Built API endpoints at `/api/pogoda/experience/` and `/api/pogoda/education/`
  - **Anti-Scraping Protection**: Implemented rate limiting (10 requests/minute per IP) using DRF throttling
  - **Data Migration**: Database seeded with 6 work experiences and 2 education entries from Jaroslaw Pogoda's LinkedIn
  - **Angular Integration**: Created HTTP service to fetch data dynamically from backend API
  - **SSR Compatibility**: Added platform detection to only make API calls in browser (not during SSR)
  - **Fallback System**: Component falls back to static data if API is unavailable for reliability
  - **CORS Configuration**: Configured CORS to allow frontend access while maintaining security
  - **Workflows**: Both backend (port 8000) and frontend (port 5000) running successfully
  
- **Pogoda Experience Page - Real LinkedIn Data**:
  - Populated experience page with Jaroslaw Pogoda's actual LinkedIn professional history
  - Added 6 work experiences: Gesture (current), Per Scholas, Sprint, Azodio.com, Bellevue Hospital, Freelance IT
  - Updated education with Queens College BS in Computer Science (2010-2016) and Triplebyte certification (2022)
  - All job descriptions, technologies, dates, and locations now reflect real professional background
  - Experience extracted from public LinkedIn profile via web search (LinkedIn direct fetch not supported)
  - Data dynamically loaded from PostgreSQL database via REST API

## Recent Changes (November 12, 2025)
- **New Pogoda Software Pages**:
  - Created complete Pogoda Software section with professional experience display
  - Added navigation and footer components for Pogoda pages
  - Created `/pogoda` home page with LinkedIn integration
  - Created `/pogoda/experience` page with professional timeline layout
  - Modern card-based design with technology tags and timeline visualization
  
- **Major Security Upgrade & Dependency Cleanup**:
  - Angular: Upgraded from 19.0.0 to 19.2.15 (fixed high severity SSR vulnerability)
  - All packages updated to latest secure versions
  - **0 security vulnerabilities** remaining (verified with npm audit)
  
- **Dependency Reduction**:
  - **Removed unused frontend dependencies**: @angular/forms, @angular/animations, portfolio-resume-frontend self-reference
  - **Removed unused dev dependencies**: Karma, Jasmine testing framework (using Playwright for E2E)
  - **Removed unused backend dependencies**: behave (using pytest-bdd instead)
  - **Result**: Reduced package count from 1157 to 849 packages (-27% reduction)
  
- **Code Cleanup**:
  - Removed all unused Jasmine/Karma test files (.spec.ts files)
  - Removed karma.conf.js and test configuration directory
  - Removed unused backend unit test examples
  - **Result**: Smaller, more maintainable codebase
  
- **SSR Fixes**:
  - Updated main.server.ts to support Angular 19.2.x SSR API changes (BootstrapContext)
  - Fixed NG0401 error by properly passing bootstrap context
  - THREE.js platform detection maintained for browser-only rendering
  
- **Bug Fixes from Previous Session** (November 6, 2025):
  - Added favicon.svg to resolve 404 error in browser console
  - Fixed SSR compatibility issue with THREE.js by adding platform detection
  - Ensured browser-specific code only runs in browser context
  
- **Verification**: All core functionality tested and working properly
  - Frontend: Angular 19.2.15 SSR working correctly
  - Backend: Django 5.1.5 running without issues
  - Navigation: All routes functioning properly
  - 3D models: Platform detection prevents SSR errors
  - Security: 0 vulnerabilities in production and dev dependencies

## Overview
This is a full-stack portfolio and resume application featuring:
- **Frontend**: Angular 19 application with Server-Side Rendering (SSR)
- **Backend**: Django 5.1.5 REST API (currently minimal setup)
- **Testing**: Playwright-based end-to-end testing suite

The application showcases Kevin Ortiz's portfolio as a Quality Assurance & DevOps Engineer, with sections for About, Experience, Projects, and Contact information.

## Running the Application

This project supports two deployment approaches:

### Option 1: Docker (Universal - Recommended for Local Development)
The original Docker-based setup works on any system with Docker installed:

```bash
# Set environment variables
export FRONTEND_PORT=4200
export BACKEND_PORT=8000

# Run with docker-compose
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:4200
- Backend: http://localhost:8000

### Option 2: Replit (Cloud Development)
On Replit, Docker is not supported. Instead, the application runs natively:

**Frontend**: 
```bash
cd Frontend/portfolioResume
npm start -- --port 5000 --host 0.0.0.0
```

**Backend**:
```bash
cd Backend/controller
python manage.py runserver 0.0.0.0:8000
```

**Note**: The Angular configuration in `angular.json` is kept universal (no hardcoded ports). Port and host are specified via command-line arguments passed through npm to the Angular dev server in the Replit workflow.

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
- **Port**: 8000
- **Start Command**: `python manage.py runserver 0.0.0.0:8000` (from Backend/controller directory)
- **Technologies**: Django 5.1.5, PostgreSQL, Django REST Framework, Gunicorn
- **Features**:
  - REST API endpoints for Pogoda experience and education data
  - Rate limiting (10 requests/minute) for anti-scraping protection
  - CORS configuration for frontend integration
  - Database models for WorkExperience and Education
  - Management command for seeding database: `python manage.py seed_pogoda_data`
- **Status**: Fully functional API serving dynamic data from PostgreSQL

### Testing
- **Framework**: Playwright with pytest-bdd
- **Test Types**: BDD (Behavior-Driven Development) with Gherkin feature files
- **Coverage**: Home page, About, Experience, Projects, Contact pages

## Replit Configuration

### Workflows
The project uses two workflows:

**Frontend Workflow:**
- **Name**: `frontend`
- **Command**: `cd Frontend/portfolioResume && npm start -- --port 5000 --host 0.0.0.0`
- **Output**: Webview on port 5000
- **Status**: Running

**Backend Workflow:**
- **Name**: `backend`
- **Command**: `cd Backend/controller && python manage.py runserver 0.0.0.0:8000`
- **Output**: Console (internal API)
- **Port**: 8000
- **Status**: Running

### Angular Configuration
The Angular configuration in `angular.json` remains universal with no hardcoded ports. When running on Replit, port and host are specified via command-line flags in the workflow command to enable Replit's proxy access while keeping the codebase portable for Docker deployment.

### Routes
**Kevin Ortiz Portfolio:**
- `/` - Redirects to `/kevin` (home page)
- `/kevin` - Kevin Ortiz portfolio home
- `/kevin/about` - About page
- `/kevin/experience` - Experience page
- `/kevin/projects` - Projects showcase
- `/kevin/contacts` - Contact form
- `/kevin/blender-projects` - Blender projects showcase

**Pogoda Software:**
- `/pogoda` - Pogoda Software home page
- `/pogoda/experience` - Professional experience timeline with LinkedIn integration

## Deployment
Configured for Replit autoscale deployment:
- **Build**: `cd Frontend/portfolioResume && npm install && npm run build`
- **Run**: `cd Frontend/portfolioResume && npx --yes serve dist/portfolio-resume-frontend/browser -l 5000`
- **Type**: Autoscale (stateless, scales based on traffic)
- **Note**: Commands navigate to the subdirectory first to handle monorepo structure

## Known Issues
- WebGL/Three.js features may not work in Replit's browser preview due to lack of WebGL context support in the iframe environment. These features will work when deployed or accessed directly via the public URL.
- Frontend may initially show fallback data if backend takes time to start (this is expected behavior)

## Backend API Documentation

### Pogoda API Endpoints

**Base URL**: `http://localhost:8000/api/pogoda/`

#### Experience Endpoint
- **URL**: `/api/pogoda/experience/`
- **Method**: GET
- **Authentication**: None (rate limited to 10 requests/minute per IP)
- **Response**: JSON array of work experience objects
- **Fields**: id, company, role, period, location, description (array), technologies (array), order

#### Education Endpoint
- **URL**: `/api/pogoda/education/`
- **Method**: GET
- **Authentication**: None (rate limited to 10 requests/minute per IP)
- **Response**: JSON array of education objects
- **Fields**: id, institution, degree, period, location, order

### Database Setup
To set up the database on a fresh deployment:
```bash
# Run migrations
python manage.py migrate

# Seed Pogoda data
python manage.py seed_pogoda_data
```

## GitHub Integration Note
The Replit GitHub OAuth connector was attempted but could not be completed via the built-in OAuth flow. To push changes to `https://github.com/PogodaSoftware/main_frame`, use a GitHub Personal Access Token (classic) with `repo` scope, stored as a secret named `GITHUB_TOKEN`. Then push using:
```bash
git remote set-url origin https://<username>:$GITHUB_TOKEN@github.com/PogodaSoftware/main_frame.git
git push origin main
```

## Future Enhancements
- Implement backend endpoints for Kevin's contact form
- Add admin interface for managing experience/education data
- Integrate additional portfolio projects into database
- Optional: Integrate LinkedIn API for real-time profile data updates
- Deploy backend alongside frontend on production
