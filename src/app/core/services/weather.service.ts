import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface WeatherResponse {
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly apiKey = API_CONFIG.WEATHER_API.apiKey;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private http: HttpClient) {}

  getCurrentWeatherByCoordinates(lat: number, lon: number, units: 'metric' | 'imperial' = 'metric'): Observable<WeatherResponse> {
    const params: Record<string, string> = {
      lat: lat.toString(),
      lon: lon.toString(),
      units,
      appid: this.apiKey
    };

    return this.http.get<WeatherResponse>(this.baseUrl, { params });
  }
}

