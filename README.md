# Portfolio Resume Application

A full-stack portfolio and resume application featuring two independent professional portfolios built with **Angular 19** (SSR) and **Django 5.1.5** backed by **PostgreSQL**.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Option 1: Replit (Cloud Development)](#option-1-replit-cloud-development)
  - [Option 2: Docker (Local Development)](#option-2-docker-local-development)
- [Backend API Documentation](#backend-api-documentation)
  - [Endpoints](#endpoints)
  - [Rate Limiting](#rate-limiting)
  - [Database Models](#database-models)
  - [Management Commands](#management-commands)
- [Frontend Architecture](#frontend-architecture)
  - [Application Configuration](#application-configuration)
  - [Routing](#routing)
  - [Kevin Ortiz Portfolio](#kevin-ortiz-portfolio)
  - [Pogoda Software Section](#pogoda-software-section)
  - [SSR Strategy](#ssr-strategy)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Known Issues](#known-issues)

---

## Overview

This application showcases two independent professional portfolios:

1. **Kevin Ortiz** - Quality Assurance & DevOps Engineer portfolio with interactive 3D Blender projects, skills showcase, and contact information.
2. **Pogoda Software** - Jaroslaw Pogoda's professional experience and education, dynamically loaded from a PostgreSQL database via REST API.

Both sections share the same Angular application but operate independently with separate navigation, styling, and data sources.

---

## Features

- **Server-Side Rendering (SSR)** - Angular 19 SSR with hydration for fast initial page loads and SEO
- **Dynamic Data Loading** - Pogoda's experience/education data served from PostgreSQL via Django REST API
- **Fallback System** - Static data displayed during SSR or when the API is unavailable
- **Interactive 3D Models** - Three.js WebGL viewers for Blender projects with orbit controls and HDR environments
- **Responsive Design** - Desktop and mobile layouts with hamburger navigation menus
- **Anti-Scraping Protection** - Rate limiting (10 requests/minute per IP) on all API endpoints
- **CORS Security** - Cross-origin requests restricted to authorized frontend domains
- **Admin Interface** - Django admin panel for managing experience and education records

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Angular | 19.x | Frontend framework with SSR |
| TypeScript | 5.x | Type-safe JavaScript |
| SCSS | - | Styling with variables and nesting |
| Three.js | latest | 3D model rendering (WebGL) |
| RxJS | 7.x | Reactive HTTP calls and subscriptions |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Django | 5.1.5 | Web framework and ORM |
| Django REST Framework | 3.x | REST API endpoints |
| PostgreSQL | 16.x | Relational database |
| django-cors-headers | 4.x | CORS policy management |
| Gunicorn | 23.x | Production WSGI server |

### Testing
| Technology | Purpose |
|---|---|
| Playwright | End-to-end browser testing |
| pytest-bdd | BDD test runner with Gherkin feature files |

---

## Project Structure

```
.
├── README.md                          # This file
├── replit.md                          # Replit-specific project documentation
├── docker-compose.yml                 # Docker orchestration config
│
├── Frontend/portfolioResume/          # Angular 19 frontend application
│   ├── src/
│   │   ├── main.ts                    # Browser bootstrap entry point
│   │   ├── main.server.ts             # SSR bootstrap entry point
│   │   ├── app/
│   │   │   ├── app.component.ts       # Root component (router outlet)
│   │   │   ├── app.config.ts          # Browser app configuration (providers)
│   │   │   ├── app.config.server.ts   # SSR app configuration
│   │   │   ├── app.routes.ts          # All route definitions
│   │   │   │
│   │   │   ├── Kevin-Pages/           # Kevin Ortiz portfolio section
│   │   │   │   ├── home/              # Landing page with profile
│   │   │   │   ├── about/             # Biography and experience summary
│   │   │   │   ├── experience/        # Technical skills grid
│   │   │   │   ├── projects/          # 3D Blender project showcase
│   │   │   │   ├── contact/           # Email and LinkedIn contact info
│   │   │   │   ├── blenderfiles/      # Full-screen 3D model viewer
│   │   │   │   ├── navigation/        # Kevin's responsive nav bar
│   │   │   │   ├── footer/            # Kevin's copyright footer
│   │   │   │   └── global/            # Shared service (URL opener, Three.js)
│   │   │   │
│   │   │   └── Pogoda-Software-Pages/ # Pogoda Software section
│   │   │       ├── home/              # Landing page with LinkedIn link
│   │   │       ├── experience/        # Professional timeline (API-driven)
│   │   │       ├── navigation/        # Pogoda's responsive nav bar
│   │   │       ├── footer/            # Pogoda's copyright footer
│   │   │       └── services/          # HTTP service for backend API calls
│   │   │
│   │   └── assets/                    # Images, 3D models, HDR maps, resume
│   ├── angular.json                   # Angular CLI configuration
│   └── package.json                   # Node.js dependencies
│
├── Backend/controller/                # Django backend application
│   ├── manage.py                      # Django management CLI
│   ├── requirements.txt               # Python dependencies
│   ├── main_frame_project/            # Django project settings
│   │   ├── settings.py                # Database, CORS, rate limiting config
│   │   ├── urls.py                    # Root URL routing
│   │   ├── wsgi.py                    # WSGI entry point (production)
│   │   └── asgi.py                    # ASGI entry point (async)
│   └── pogoda_api/                    # Pogoda REST API app
│       ├── models.py                  # WorkExperience & Education models
│       ├── views.py                   # Read-only API viewsets
│       ├── serializers.py             # JSON serialization
│       ├── urls.py                    # API route registration
│       ├── admin.py                   # Django admin configuration
│       ├── apps.py                    # App configuration
│       └── management/commands/
│           └── seed_pogoda_data.py    # Database seeder command
│
└── Playwright/                        # E2E test suite
    ├── features/                      # BDD Gherkin feature files
    ├── pages/                         # Page object models
    └── steps/                         # Step definitions
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (for Angular frontend)
- **Python** 3.11+ (for Django backend)
- **PostgreSQL** 16+ (for database)

### Option 1: Replit (Cloud Development)

On Replit, both workflows start automatically:

**Frontend** (port 5000):
```bash
cd Frontend/portfolioResume
npm start -- --port 5000 --host 0.0.0.0
```

**Backend** (port 8000):
```bash
cd Backend/controller
python manage.py runserver 0.0.0.0:8000
```

**Database setup** (first time only):
```bash
cd Backend/controller
python manage.py migrate
python manage.py seed_pogoda_data
```

### Option 2: Docker (Local Development)

```bash
export FRONTEND_PORT=4200
export BACKEND_PORT=8000
docker-compose up
```

The application will be available at:
- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:8000`

---

## Backend API Documentation

### Endpoints

All endpoints are prefixed with `/api/pogoda/`.

| Method | Endpoint | Description | Response |
|---|---|---|---|
| GET | `/api/pogoda/experience/` | List all work experiences | JSON array |
| GET | `/api/pogoda/experience/{id}/` | Get single experience | JSON object |
| GET | `/api/pogoda/education/` | List all education entries | JSON array |
| GET | `/api/pogoda/education/{id}/` | Get single education entry | JSON object |

#### Example Response - Work Experience

```json
[
  {
    "id": 1,
    "company": "Gesture",
    "role": "Full Stack Software Engineer - Level 1",
    "period": "2022 - Present",
    "location": "New York, United States",
    "description": [
      "Engineered the Shop Flow feature...",
      "Developed frontend interfaces..."
    ],
    "technologies": ["JavaScript", "React", "Node.js"],
    "order": 0
  }
]
```

#### Example Response - Education

```json
[
  {
    "id": 1,
    "institution": "Queens College",
    "degree": "Bachelor of Science in Computer Science",
    "period": "2010 - 2016",
    "location": "Queens, New York",
    "order": 0
  }
]
```

### Rate Limiting

All API endpoints are protected by anonymous rate throttling:
- **Limit**: 10 requests per minute per IP address
- **Scope**: Anonymous users (no authentication required)
- **Response on limit exceeded**: HTTP 429 Too Many Requests

### Database Models

#### WorkExperience
| Field | Type | Description |
|---|---|---|
| id | BigAutoField | Primary key |
| company | CharField(200) | Employer name |
| role | CharField(200) | Job title |
| period | CharField(100) | Date range (e.g., "2022 - Present") |
| location | CharField(200) | Geographic location |
| description | JSONField | Array of responsibility bullet points |
| technologies | JSONField | Array of technology/skill names |
| order | IntegerField | Display order (ascending) |
| created_at | DateTimeField | Auto-set on creation |
| updated_at | DateTimeField | Auto-set on modification |

#### Education
| Field | Type | Description |
|---|---|---|
| id | BigAutoField | Primary key |
| institution | CharField(200) | School or certifying body |
| degree | CharField(200) | Degree or certification title |
| period | CharField(100) | Date range |
| location | CharField(200) | Geographic location |
| order | IntegerField | Display order (ascending) |
| created_at | DateTimeField | Auto-set on creation |
| updated_at | DateTimeField | Auto-set on modification |

### Management Commands

```bash
# Seed database with Pogoda's professional data
python manage.py seed_pogoda_data

# Run database migrations
python manage.py migrate

# Create admin superuser
python manage.py createsuperuser

# Access Django admin at /admin/
```

---

## Frontend Architecture

### Application Configuration

The Angular app uses a provider-based configuration pattern:

- **`app.config.ts`** (Browser): Registers routing, HttpClient (with fetch backend for SSR), zone change detection with event coalescing, and client hydration with event replay.
- **`app.config.server.ts`** (SSR): Merges browser config with `provideServerRendering()` for server-side rendering support.
- **`main.ts`** (Browser): Bootstraps the app using the browser config.
- **`main.server.ts`** (SSR): Bootstraps the app using the merged server config with `BootstrapContext` for Angular 19.2.x compatibility.

### Routing

| Path | Component | Section |
|---|---|---|
| `/` | Redirect to `/kevin` | - |
| `/kevin` | KevinHomeComponent | Kevin Portfolio |
| `/kevin/about` | KevinAboutComponent | Kevin Portfolio |
| `/kevin/experience` | KevinExperienceComponent | Kevin Portfolio |
| `/kevin/projects` | KevinProjectsComponent | Kevin Portfolio |
| `/kevin/contacts` | KevinContactComponent | Kevin Portfolio |
| `/kevin/blender-projects` | KevinBlenderFilesComponent | Kevin Portfolio |
| `/pogoda` | PogodaHomeComponent | Pogoda Software |
| `/pogoda/experience` | PogodaExperienceComponent | Pogoda Software |

### Kevin Ortiz Portfolio

Kevin's section is a static portfolio showcasing his QA & DevOps skills:

- **Home** - Profile photo, CV download, social links (LinkedIn, GitHub)
- **About** - Professional biography with experience and education summary
- **Experience** - Technical skills organized in 6 categories (Languages, Frameworks, Database/Tools, Testing, DevOps, General)
- **Projects** - Interactive 3D Blender models rendered with Three.js (Snowman, Shark, Sci-Fi Crate, Gladius)
- **Contact** - Email and LinkedIn contact information
- **Blender Viewer** - Full-screen 3D model viewer with URL query parameter configuration

**Key Service: `KevinGlobalService`**
- `openPage(url)` - Opens URLs in new tabs (SSR-safe)
- `threeDimensionModelBuilder(...)` - Creates Three.js WebGL viewers with GLTF/DRACO model loading, orbit controls, HDR environments, and responsive sizing

### Pogoda Software Section

Pogoda's section dynamically loads professional data from the backend:

- **Home** - Company landing page with LinkedIn link and experience CTA
- **Experience** - Professional timeline with work history and education, loaded from PostgreSQL via REST API

**Key Service: `PogodaApiService`**
- `getExperiences()` - Fetches work experience data from `GET /api/pogoda/experience/`
- `getEducation()` - Fetches education data from `GET /api/pogoda/education/`

### SSR Strategy

The application uses a dual-rendering approach for Pogoda's data-driven pages:

1. **Server Render** - Components initialize with hardcoded fallback data in the constructor, providing instant content during SSR
2. **Browser Hydration** - After hydration, `ngOnInit` checks `isPlatformBrowser()` and makes API calls only in the browser
3. **Error Fallback** - If API calls fail, the component retains the fallback data, ensuring the page always displays content

---

## Testing

The project uses Playwright with pytest-bdd for end-to-end testing:

```bash
cd Playwright
pytest
```

Test coverage includes:
- Home page rendering and navigation
- About page content verification
- Experience page skill display
- Projects page 3D viewer initialization
- Contact page link functionality

---

## Deployment

Configured for Replit autoscale deployment:

```bash
# Build step
cd Frontend/portfolioResume && npm install && npm run build

# Run step (serves pre-built static files)
cd Frontend/portfolioResume && npx serve dist/portfolio-resume-frontend/browser -l 5000
```

**Deployment type**: Autoscale (stateless, scales based on traffic)

---

## Security

- **Rate Limiting**: 10 requests/minute per IP on all API endpoints (DRF AnonRateThrottle)
- **CORS**: Configured to allow only `localhost:5000` and `127.0.0.1:5000` in production; all origins allowed in debug mode
- **CSRF Protection**: Django middleware enabled
- **Clickjacking Protection**: X-Frame-Options header via Django middleware
- **No exposed secrets**: Database credentials loaded from environment variables

---

## Known Issues

- **WebGL in iframes**: Three.js 3D models may not render in Replit's browser preview (iframe) due to WebGL context limitations. They work correctly when accessed directly via the public URL.
- **Backend startup delay**: The frontend may briefly show fallback data if the backend takes time to start. This is expected behavior and the page updates automatically once the API responds.
