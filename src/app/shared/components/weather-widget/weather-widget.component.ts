import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService, WeatherResponse } from '../../../core/services/weather.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather-widget.component.html',
  styleUrls: ['./weather-widget.component.css']
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  weather: WeatherResponse | null = null;
  weatherLoading = false;
  weatherError = '';
  
  currentTime = new Date();
  private timerSubscription: Subscription | null = null;

  constructor(private weatherService: WeatherService) {}

  ngOnInit(): void {
    this.getLocation();

    this.timerSubscription = timer(0, 1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  getLocation(): void {
    if (navigator.geolocation) {
      this.weatherLoading = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.loadWeather(latitude, longitude);
        },
        (error) => {
          this.weatherError = 'Location access denied. Weather unavailable.';
          this.weatherLoading = false;
          console.error('Geolocation error:', error);
        }
      );
    } else {
      this.weatherError = 'Geolocation is not supported by this browser.';
    }
  }

  private loadWeather(lat: number, lon: number): void {
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

  get weatherTemperatureC(): number | null {
    if (!this.weather) return null;
    return Math.round(this.weather.main.temp);
  }

  get weatherDescription(): string | null {
    if (!this.weather || !this.weather.weather?.length) return null;
    return this.weather.weather[0].description;
  }

  get weatherIconUrl(): string | null {
    if (!this.weather || !this.weather.weather?.length) return null;
    const icon = this.weather.weather[0].icon;
    return `https://openweathermap.org/img/wn/${icon}.png`;
  }
}
