/**
 * Pogoda API Service
 *
 * Angular service that communicates with the Django REST API backend
 * to fetch Jaroslaw Pogoda's professional experience and education data.
 * This service is provided at the root level and available throughout
 * the application via dependency injection.
 *
 * API Base URL: http://localhost:8000/api/pogoda
 *
 * Endpoints consumed:
 *   GET /experience/ - Returns array of work experience records
 *   GET /education/  - Returns array of education records
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface representing a single work experience entry
 * returned by the backend API.
 */
export interface Experience {
  id: number;
  company: string;
  role: string;
  period: string;
  location: string;
  description: string[];
  technologies?: string[];
  order: number;
}

/**
 * Interface representing a single education entry
 * returned by the backend API.
 */
export interface Education {
  id: number;
  institution: string;
  degree: string;
  period: string;
  location: string;
  order: number;
}

@Injectable({
  providedIn: 'root'
})
export class PogodaApiService {
  /** Base URL for the Pogoda REST API endpoints. */
  private apiUrl = 'http://localhost:8000/api/pogoda';

  /**
   * @param http - Angular's HttpClient for making HTTP requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Fetches all work experience records from the backend API.
   *
   * @returns Observable that emits an array of Experience objects,
   *          ordered by the 'order' field (ascending).
   */
  getExperiences(): Observable<Experience[]> {
    return this.http.get<Experience[]>(`${this.apiUrl}/experience/`);
  }

  /**
   * Fetches all education records from the backend API.
   *
   * @returns Observable that emits an array of Education objects,
   *          ordered by the 'order' field (ascending).
   */
  getEducation(): Observable<Education[]> {
    return this.http.get<Education[]>(`${this.apiUrl}/education/`);
  }
}
