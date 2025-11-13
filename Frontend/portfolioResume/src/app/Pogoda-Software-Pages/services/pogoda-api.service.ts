import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:8000/api/pogoda';

  constructor(private http: HttpClient) {}

  getExperiences(): Observable<Experience[]> {
    return this.http.get<Experience[]>(`${this.apiUrl}/experience/`);
  }

  getEducation(): Observable<Education[]> {
    return this.http.get<Education[]>(`${this.apiUrl}/education/`);
  }
}
