import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlacesService } from '../../services/places.service';
import { Place } from '../../models/place.model';
import { WeatherService, WeatherResponse } from '../../core/services/weather.service';
import { MapsService } from '../../core/services/maps.service';

@Component({
  selector: 'app-place-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './place-details.component.html',
  styleUrls: ['./place-details.component.css']
})
export class PlaceDetailsComponent implements OnInit {
  place: Place | null = null;
  loading = true;
  errorMessage = '';
  isSpeaking = false;

  // Weather
  weatherLoading = false;
  weatherError = '';
  weather: WeatherResponse | null = null;

  // ✅ Cache for map URL to prevent iframe reload
  private cachedMapUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private placesService: PlacesService,
    private sanitizer: DomSanitizer,
    private weatherService: WeatherService,
    private mapsService: MapsService
  ) {}

  ngOnInit(): void {
    const coordsParam = this.route.snapshot.paramMap.get('coords');
    if (!coordsParam) {
      this.errorMessage = 'Invalid place coordinates';
      this.loading = false;
      return;
    }

    // expected formats: "lat&lng" or "lat,lng" or "lat lng"
    const match = coordsParam.match(/([+-]?\d{1,2}\.\d+)[,&]?\s*([+-]?\d{1,3}\.\d+)/);
    if (!match) {
      this.errorMessage = 'Invalid coordinates format';
      this.loading = false;
      return;
    }

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    // Try to find a known place near these coordinates
    this.loading = true;
    this.placesService.findPlaceByQuery(`${lat},${lng}`).subscribe({
      next: (found) => {
        if (found) {
          const latitude = found.latitude ?? found.coordinates?.lat;
          const longitude = found.longitude ?? found.coordinates?.lng;
          const imageUrl = found.imageUrl ?? found.images?.[0] ?? '';

          this.place = {
            ...found,
            latitude,
            longitude,
            imageUrl
          };
          
          // ✅ Reset map cache before setting new place
          this.resetMapCache();
          this.loading = false;
          
          if (latitude != null && longitude != null) {
            // ✅ Load weather immediately (no delay)
            this.loadWeather(latitude, longitude);
          }
          return;
        }

        // No matching place found — create a minimal place object from coords
        this.place = {
          id: 0,
          name: 'No information available for this attraction',
          governorate: '',
          city: '',
          description: '',
          imageUrl: '',
          latitude: lat,
          longitude: lng,
          coordinates: { lat, lng }
        } as Place;
        
        // ✅ Reset map cache
        this.resetMapCache();
        this.loading = false;
        
        // ✅ Load weather immediately
        this.loadWeather(lat, lng);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load place details. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadPlaceDetails(id: number): void {
    this.loading = true;
    this.placesService.getPlaceById(id).subscribe({
      next: (data) => {
        const latitude = data.latitude ?? data.coordinates?.lat;
        const longitude = data.longitude ?? data.coordinates?.lng;
        const imageUrl = data.imageUrl ?? data.images?.[0] ?? '';

        // ✅ Reset map cache before updating place
        this.resetMapCache();
        
        this.place = {
          ...data,
          latitude,
          longitude,
          imageUrl
        };

        this.loading = false;
        if (latitude != null && longitude != null) {
          // ✅ Load weather immediately (no delay)
          this.loadWeather(latitude, longitude);
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load place details. Please try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  private loadWeather(lat: number, lon: number): void {
    this.weatherLoading = true;
    this.weatherError = '';

    this.weatherService.getCurrentWeatherByCoordinates(lat, lon).subscribe({
      next: (weather) => {
        this.weather = weather;
        this.weatherLoading = false;
      },
      error: (err) => {
        console.error('Weather error', err);
        this.weatherError = 'Unable to load current weather.';
        this.weatherLoading = false;
      }
    });
  }

  // ✅ Helper to reset map cache when place changes
  private resetMapCache(): void {
    this.cachedMapUrl = null;
  }

  listenExplanation(): void {
    if (!this.place) return;

    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      return;
    }

    const historicalInfo = this.place.historicalInfo || '';
    const text = `${this.place.name}. ${this.place.description}. Historical information: ${historicalInfo}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  goBack(): void {
    this.router.navigate(['/places']);
  }

  private readonly fallbackImg =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"%3E%3Crect fill="%23e0e0e0" width="200" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

  onImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el?.src && el.src !== this.fallbackImg) el.src = this.fallbackImg;
  }

  // ✅ Cached getter for map URL - prevents iframe reload
  get mapEmbedUrl(): SafeResourceUrl {
    if (this.cachedMapUrl) {
      return this.cachedMapUrl;
    }
    
    if (this.place?.latitude != null && this.place.longitude != null) {
      const url = this.mapsService.getEmbedUrl(this.place.latitude, this.place.longitude);
      this.cachedMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      return this.cachedMapUrl;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  get navigationLink(): string | null {
    if (this.place?.latitude != null && this.place.longitude != null) {
      return this.mapsService.getNavigationLink(this.place.latitude, this.place.longitude);
    }
    return null;
  }

  get weatherTemperatureC(): number | null {
    if (!this.weather) return null;
    return Math.round(this.weather.main.temp);
  }

  get weatherDescription(): string | null {
    if (!this.weather || !this.weather.weather?.length) return null;
    return this.weather.weather[0].description;
  }

  // ✅ Fixed: removed extra spaces in icon URL
  get weatherIconUrl(): string | null {
    if (!this.weather || !this.weather.weather?.length) return null;
    const icon = this.weather.weather[0].icon;
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  }
}