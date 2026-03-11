import { Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class MapsService {
  private readonly apiKey = API_CONFIG.GOOGLE_MAPS.apiKey;

  getEmbedUrl(lat: number, lng: number): string {
    // Prefer public embed URL that doesn't require an API key for nicer embedding.
    // Example: https://maps.google.com/maps?q=lat,lng&z=13&output=embed
    const publicEmbed = `https://maps.google.com/maps?q=${lat},${lng}&z=13&output=embed`;

    // If an API key is provided, use the Maps Embed API (v1) which supports place view.
    if (this.apiKey) {
      const base = 'https://www.google.com/maps/embed/v1/place';
      const queryParams = new URLSearchParams({
        q: `${lat},${lng}`,
        key: this.apiKey
      });
      return `${base}?${queryParams.toString()}`;
    }

    return publicEmbed;
  }

  getNavigationLink(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}

