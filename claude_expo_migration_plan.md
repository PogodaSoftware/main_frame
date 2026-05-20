# Expo React Native Migration Plan for Claude Code

This document provides a comprehensive set of instructions and a phased plan that you can provide directly to Claude Code to execute the migration of the Beauty application from Angular to a mobile-first Expo React Native app.

## Prompt to give to Claude Code

> **System Context for Claude Code**: 
> You are migrating an existing web application (`Frontend/beautyApp`, currently built in Angular 19 with NgRx) into a brand new mobile-first React Native application using **Expo**. The backend is a Django REST framework API split across `Backend/controller/beauty_api` and `Backend/controller/bff_api`. 
>
> Your goal is to scaffold the new Expo project and implement the frontend, preserving all existing domain logic and API integration from the Angular app.
> 
> ### Tech Stack:
> - Framework: React Native with **Expo** (using Expo Router for file-based routing)
> - State Management: Zustand (preferred for simplicity) or Redux Toolkit (to map from NgRx)
> - Styling: NativeWind (Tailwind for React Native) or standard StyleSheet
> - API Client: Axios (with interceptors to handle the `beauty-session-refresh` flow)
> - Forms: React Hook Form with Zod validation
>
> ### Project Initialization & Environment Setup:
> 1. Verify your environment has Bun installed. If any CLI tools or dependencies are missing (like Expo CLI or React Native prerequisites), use your terminal tools to download and install them.
> 2. Run `bunx create-expo-app@latest beautyAppMobile` in the `Frontend/` directory to generate the application structure. If `create-expo-app` prompts for anything, use non-interactive flags (e.g. `--yes` or `-y`) or provide input directly.
> 3. `cd` into the new `beautyAppMobile` directory and install all necessary UI and networking dependencies (e.g., axios, zustand, nativewind, etc.) via `bun install` or `bun add`.
> 4. Set up the `src/` directory with `components`, `app` (Expo Router), `services`, `store`, `hooks`, and `constants`.
> 5. Ensure you start the application locally using `bunx expo start` to verify that the scaffolding runs successfully before moving on to feature development.

---

### Phase 1: Foundation & API Networking Setup
1. **API Client & Auth Interceptor**: 
   - Create an Axios instance in `src/services/api.ts`.
   - Implement interceptors to handle 401 Unauthorized errors by calling `/session/refresh/` (from `beauty_api/urls.py`) and retrying the request.
   - Create typed API services mapping to the Django endpoints for Authentication (`/login/`, `/signup/`, `/logout/`, `/protected/me/`).
2. **State Management**:
   - Set up the global store (e.g., Zustand) to hold the current user session (Customer vs. Business vs. Admin).
3. **Routing Architecture (Expo Router)**:
   - Create separate layout groups for `(customer)`, `(business)`, and `(auth)`.
   - Implement a routing guard to restrict access to `/protected/...` routes based on user session state.

### Phase 2: Customer Marketplace & Discovery
1. **Home / Discovery Screen**:
   - Map to `/categories/<category>/` and `/services/search/`.
   - Build UI for searching services, filtering by category, and viewing results.
2. **Service & Provider Detail Screens**:
   - Map to `/services/<int:service_id>/` and `/providers/<int:provider_id>/`.
   - Display service details, pricing (using the BFF `price_format_service` logic), and provider information.
   - Include the Review list (`/services/<service_id>/reviews/`) and Favorite toggle (`/protected/services/<service_id>/favorite/`).

### Phase 3: Booking Flow & Customer Portal
1. **Booking & Checkout**:
   - Implement the flow to book a service based on business availability (`BusinessAvailabilityView` logic).
2. **Customer Dashboard (My Bookings)**:
   - Map to `/protected/bookings/`.
   - Create screens for upcoming and past bookings.
   - Add functionality to Cancel (`/cancel/`), Cancel within Grace Period (`/cancel-grace/`), and Reschedule (`/reschedule/`).
3. **Chat System**:
   - Implement the chat interface (`/protected/chats/` and `/protected/bookings/<booking_id>/chat/`).
   - Create a real-time (or polling) chat UI for the customer to talk to the business provider.

### Phase 4: Business / Provider Portal
1. **Business Onboarding**:
   - Map to `/business/signup/`, `/business/login/`.
   - Implement the business application flow (`/protected/business/application/` & `/submit/`).
2. **Business Dashboard & Earnings**:
   - Map to `/protected/business/dashboard/` and `/protected/business/earnings/`.
   - Display key metrics, upcoming appointments, and revenue.
3. **Calendar & Availability Management**:
   - Map to `/protected/business/calendar/` and `/protected/business/availability/`.
   - Create a calendar interface to manage working hours and block off unavailable times.
4. **Service Management**:
   - Map to `/protected/business/services/`.
   - Allow providers to create, edit, and manage their service offerings.

### Phase 5: HATEOAS & BFF Integration
1. **BFF API Consumption**:
   - Review the `Backend/controller/bff_api` for application gating (`application_gate.py`), timezone handling (`beauty_timezone_service.py`), and HATEOAS links (`hateoas_service.py`).
   - Implement a flexible UI renderer or action dispatcher that utilizes the HATEOAS links provided by the backend to dynamically render available actions (e.g., showing a "Cancel Booking" button only if the backend returns the cancel link).

---

### Step-by-Step Execution Plan for Claude Code:
1. **Step 1**: Environment Setup & Init. Verify Bun. Run the Expo init command (`bunx create-expo-app@latest beautyAppMobile`). Install all necessary dependencies (Tailwind/NativeWind, ESLint, Prettier, Axios, Zustand) via terminal commands (`bun add`). Run `bunx expo start` to verify the app builds and runs.
2. **Step 2**: Build the Auth flow (Screens: Login, Sign Up for both Customer & Business). Connect to backend.
3. **Step 3**: Build the App Shell (Tabs for Home, Bookings, Chat, Profile).
4. **Step 4**: Implement the Customer Marketplace (Search, Service Details, Provider Details).
5. **Step 5**: Implement the Booking flow.
6. **Step 6**: Implement the Chat interface.
7. **Step 7**: Build out the Business Portal (Dashboard, Calendar, Services).
8. **Step 8**: Thorough testing against the local Django backend.

> **Instruction to Claude**: Please acknowledge this plan, review the existing Angular `package.json` and backend `urls.py` in the repo to verify endpoints, and begin with Step 1 (Project Initialization and Foundation).
