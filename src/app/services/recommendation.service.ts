import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recommendation } from '../models/recommendation.model';
import { API_CONFIG } from '../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private readonly apiUrl =
    (API_CONFIG.TOURISM_API.baseUrl && `${API_CONFIG.TOURISM_API.baseUrl}/recommendations`) ||
    'https://localhost:5001/api/recommendations';

  constructor(private http: HttpClient) {}

  getRecommendations(userId: number): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`${this.apiUrl}/user/${userId}`);
  }

  createRecommendation(recommendation: Recommendation): Observable<Recommendation> {
    return this.http.post<Recommendation>(this.apiUrl, recommendation);
  }

  deleteRecommendation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
