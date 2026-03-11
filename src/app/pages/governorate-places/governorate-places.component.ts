import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PlacesService } from '../../services/places.service';
import { Place } from '../../models/place.model';

type SortOption = 'name-asc' | 'name-desc' | 'distance-asc';

@Component({
  selector: 'app-governorate-places',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './governorate-places.component.html',
  styleUrls: ['./governorate-places.component.css']
})
export class GovernoratePlacesComponent implements OnInit {
  private readonly allPlaces = signal<Place[]>([]);

  readonly loading = signal(true);
  readonly errorMessage = signal('');

  readonly searchTerm = signal('');
  readonly selectedCity = signal<'All' | string>('All');
  readonly sortOption = signal<SortOption>('name-asc');

  readonly governorateName = signal<string>('');
  readonly cities = signal<string[]>(['All']);

  // Geolocation
  private userLatitude: number | null = null;
  private userLongitude: number | null = null;
  readonly geolocationError = signal('');

  readonly filteredPlaces = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const city = this.selectedCity();
    const sort = this.sortOption();
    const gov = this.governorateName();

    let result = this.allPlaces().filter((place) => {
      const inGovernorate =
        !!place.governorate &&
        place.governorate.toLowerCase() === gov.toLowerCase();

      const matchesSearch =
        !term || place.name.toLowerCase().includes(term);

      const matchesCity =
        city === 'All' || place.city === city;

      return inGovernorate && matchesSearch && matchesCity;
    });

    result = result.map((place) => ({
      ...place,
      distanceKm: this.calculateDistanceFromUser(place)
    }));

    result.sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'distance-asc': {
          const da = a.distanceKm;
          const db = b.distanceKm;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        }
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly placesService: PlacesService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const govParam = this.route.snapshot.paramMap.get('name') ?? '';
    this.governorateName.set(govParam);
    this.loadPlacesForGovernorate();
    this.requestUserLocation();
  }

  private loadPlacesForGovernorate(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.placesService.getPlacesForGovernorate(this.governorateName()).subscribe({
      next: (places) => {
        this.allPlaces.set(places);
        this.buildCities();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load places for this governorate. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  private buildCities(): void {
    const gov = this.governorateName();
    const citySet = new Set<string>();

    this.allPlaces()
      .filter((p) => p.governorate?.toLowerCase() === gov.toLowerCase())
      .forEach((p) => citySet.add(p.city));

    this.cities.set(['All', ...Array.from(citySet).sort()]);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  onCityChange(city: string): void {
    this.selectedCity.set(city as 'All' | string);
  }

  onSortChange(option: SortOption): void {
    this.sortOption.set(option);
  }

  trackByPlaceId(_: number, place: Place): number {
    return place.id;
  }

  private readonly fallbackImg =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"%3E%3Crect fill="%23e0e0e0" width="200" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

  onImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el?.src && el.src !== this.fallbackImg) el.src = this.fallbackImg;
  }

  goToDetails(place: Place): void {
    const lat = place.latitude ?? place.coordinates?.lat;
    const lng = place.longitude ?? place.coordinates?.lng;
    if (lat != null && lng != null) {
      this.router.navigate(['/place', `${lat}&${lng}`]);
    } else if (place.id != null) {
      // fallback to id-based navigation if coords missing
      this.router.navigate(['/place', `${place.id}`]);
    }
  }

  private requestUserLocation(): void {
    if (!('geolocation' in navigator)) {
      this.geolocationError.set('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLatitude = position.coords.latitude;
        this.userLongitude = position.coords.longitude;
      },
      (error) => {
        console.warn('Geolocation error', error);
        this.geolocationError.set('Unable to access your location. Distance sorting may be less accurate.');
      }
    );
  }

  private calculateDistanceFromUser(place: Place): number | undefined {
    if (
      this.userLatitude == null ||
      this.userLongitude == null ||
      place.latitude == null ||
      place.longitude == null
    ) {
      return undefined;
    }

    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(place.latitude - this.userLatitude);
    const dLon = toRad(place.longitude - this.userLongitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(this.userLatitude)) *
        Math.cos(toRad(place.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10;
  }
}

