import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { RecommendationService } from '../../services/recommendation.service';
import { AuthService } from '../../services/auth.service';
import { Recommendation } from '../../models/recommendation.model';
import { PlacesService } from '../../services/places.service';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.css']
})
export class RecommendationsComponent implements OnInit {
  recommendations: Recommendation[] = [];
  loading = true;
  errorMessage = '';
  noRecommendations = false;

  constructor(
    private recommendationService: RecommendationService,
    private authService: AuthService,
    private router: Router
    ,
    private placesService: PlacesService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadRecommendations(user.id);
  }

  loadRecommendations(userId: number): void {
    this.loading = true;
    this.recommendationService
      .getRecommendations(userId)
      .pipe(
        catchError((err) => {
          console.warn('Recommendation API failed, falling back to PlacesService', err);
          return this.placesService.getAllPlaces().pipe(
            map((places) =>
              places.slice(0, 12).map((p, idx) => ({
                id: p.id ?? idx + 1,
                userId,
                place: p,
                score: Math.round(50 + Math.random() * 50),
                reason: 'Popular place you might like'
              }))
            ),
            catchError(() => of([] as any))
          );
        })
      )
      .subscribe({
        next: (data) => {
          this.recommendations = data as Recommendation[];
          this.noRecommendations = data.length === 0;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load recommendations. Please try again later.';
          this.loading = false;
          console.error(err);
        }
      });
  }

  goToPlaceDetails(place: any): void {
    const lat = place.latitude ?? place.coordinates?.lat;
    const lng = place.longitude ?? place.coordinates?.lng;
    if (lat != null && lng != null) {
      this.router.navigate(['/place', `${lat}&${lng}`]);
    } else if (place.id != null) {
      this.router.navigate(['/place', `${place.id}`]);
    }
  }

  removeRecommendation(id: number): void {
    this.recommendationService.deleteRecommendation(id).subscribe({
      next: () => {
        this.recommendations = this.recommendations.filter(r => r.id !== id);
        if (this.recommendations.length === 0) {
          this.noRecommendations = true;
        }
      },
      error: (err) => {
        console.error('Failed to remove recommendation:', err);
      }
    });
  }
}
