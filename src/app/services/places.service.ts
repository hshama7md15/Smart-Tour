import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap
} from 'rxjs';
import { Place } from '../models/place.model';
import { API_CONFIG } from '../core/config/api.config';
import { GovernorateService } from './governorate.service';
import { Governorate } from '../models/governorate.model';

interface OpenTripMapPlace {
  xid: string;
  name: string;
  kinds: string;
  point: {
    lat: number;
    lon: number;
  };
}

interface WikipediaSummary {
  extract?: string;
  thumbnail?: {
    source?: string;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private readonly openTripMapApiKey = API_CONFIG.TOURISM_API.openTripMapApiKey;
  private placesCache$?: Observable<Place[]>;

  // Restrict to tourism-focused kinds only
  private readonly allowedKinds = [
    'historic',
    'monuments',
    'monuments_and_memorials',
    'archaeology',
    'egyptian_temples',
    'museums',
    'fortifications',
    'religion'
  ];

  constructor(
    private http: HttpClient,
    private governorateService: GovernorateService
  ) {}

  /**
   * Load all tourist places in Egypt from OpenTripMap
   * and enrich them with Wikipedia summaries.
   */
  getAllPlaces(): Observable<Place[]> {
    if (this.placesCache$) {
      return this.placesCache$;
    }

    if (!this.openTripMapApiKey) {
      console.warn('OpenTripMap API key is missing. Returning empty places list.');
      this.placesCache$ = of([]);
      return this.placesCache$;
    }

    const radiusUrl = 'https://api.opentripmap.com/0.1/en/places/radius';

    // مركز تقريبي لمصر ونصف قطر كبير لتغطية الدولة
    const radiusParams = {
      apikey: this.openTripMapApiKey,
      lat: '26.8206',
      lon: '30.8025',
      radius: '500000',
      // kinds مخصصة للمعالم السياحية فقط (تاريخية / معابد / متاحف)
      kinds:
        'historic,monuments_and_memorials,archaeology,egyptian_temples,museums,fortifications,religion',
      // نطلب فقط الأماكن ذات التقييم الأعلى
      rate: '3',
      format: 'json',
      // نطلب عدداً أكبر من المعالم لزيادة تغطية المحافظات
      limit: '250'
    };

    const otm$ = this.http.get<OpenTripMapPlace[]>(radiusUrl, { params: radiusParams }).pipe(
      catchError((err) => {
        console.error('OpenTripMap error', err);
        return of<OpenTripMapPlace[]>([]);
      })
    );

    const govs$ = this.governorateService.getAllGovernorates().pipe(
      catchError(() => of<Governorate[]>([]))
    );

    this.placesCache$ = forkJoin([otm$, govs$]).pipe(
      switchMap(([otmPlaces, governorates]) => {
        const named = otmPlaces.filter(
          (p) =>
            !!p.name &&
            this.allowedKinds.some((kind) => p.kinds?.includes(kind))
        );
        const withIds = named.map((p, index) => ({
          ...p,
          internalId: index + 1
        }));

        if (!withIds.length) {
          // Fallback: if OpenTripMap returned no places (e.g. API key/rate limits/CORS),
          // load local static data shipped with the app so governorate pages still show content.
          return this.http.get<any[]>('src/assets/data/egypt-places.json').pipe(
            map((local) =>
              local.map((p, idx) => {
                const latitude = p.latitude ?? p.coordinates?.lat ?? undefined;
                const longitude = p.longitude ?? p.coordinates?.lng ?? undefined;

                const imagesArr: string[] | undefined =
                  p.images && p.images.length
                    ? p.images
                    : p.imageUrl
                    ? [p.imageUrl]
                    : undefined;

                const place: Place = {
                  id: p.id ?? idx + 1,
                  xid: p.xid,
                  name: p.name || 'No information available for this attraction',
                  governorate: p.governorate || '',
                  city: p.city || '',
                  description: p.description || p.history || '',
                  imageUrl: imagesArr?.[0] || p.imageUrl || '',
                  images: imagesArr,
                  latitude,
                  longitude,
                  coordinates: p.coordinates || (latitude && longitude ? { lat: latitude, lng: longitude } : undefined),
                  category: p.category || p.kinds || '',
                  rating: p.rating ?? 4.5,
                  visitorsPerYear: p.visitorsPerYear ?? 0,
                  wikipediaLink: p.wikipediaLink || ''
                };

                return place;
              })
            ),
            catchError(() => of<Place[]>([]))
          );
        }

        const requests = withIds.map((p) =>
          this.enrichWithWikipediaAndGovernorate(p, governorates)
        );

        return forkJoin(requests).pipe(
          map((places) => places.filter((p): p is Place => !!p))
        );
      }),
      shareReplay(1)
    );

    return this.placesCache$;
  }

  /**
   * Load places for a specific governorate using OpenTripMap radius endpoint
   * centered on the governorate coordinates. Falls back to local data when
   * the API fails or returns no results.
   */
  getPlacesForGovernorate(governorateName: string, radiusMeters = 50000): Observable<Place[]> {
    return this.governorateService.getAllGovernorates().pipe(
      switchMap((governorates) => {
        const gov = governorates.find(
          (g) => g.nameEn.toLowerCase() === governorateName.toLowerCase() || g.name.toLowerCase() === governorateName.toLowerCase()
        );

        if (!gov || !gov.coordinates) {
          // Fallback to local places filtered by governorate name
          return this.http.get<Place[]>('/data/egypt-places.json').pipe(
            map((local) => local.filter((p) => (p.governorate || '').toLowerCase() === governorateName.toLowerCase())),
            catchError(() => of<Place[]>([]))
          );
        }

        const url = 'https://api.opentripmap.com/0.1/en/places/radius';
        const params: any = {
          apikey: this.openTripMapApiKey,
          lat: String(gov.coordinates.lat),
          lon: String(gov.coordinates.lng),
          radius: String(radiusMeters),
          kinds:
            'historic,monuments_and_memorials,archaeology,egyptian_temples,museums,fortifications,religion',
          rate: '2',
          format: 'json',
          limit: '200'
        };

        return this.http.get<OpenTripMapPlace[]>(url, { params }).pipe(
          catchError((err) => {
            console.error('OpenTripMap radius error', err);
            return of<OpenTripMapPlace[]>([]);
          }),
          switchMap((otmPlaces) => {
            const named = otmPlaces.filter((p) => !!p.name && this.allowedKinds.some((k) => p.kinds?.includes(k)));
            const withIds = named.map((p, i) => ({ ...p, internalId: i + 1 }));

            if (!withIds.length) {
              // fallback to local file filtered by governorate
              return this.http.get<Place[]>('/data/egypt-places.json').pipe(
                map((local) => local.filter((p) => (p.governorate || '').toLowerCase() === governorateName.toLowerCase())),
                catchError(() => of<Place[]>([]))
              );
            }

            const requests = withIds.map((p) => this.enrichWithWikipediaAndGovernorate(p, governorates));
            return forkJoin(requests).pipe(map((places) => places.filter((p): p is Place => !!p)));
          })
        );
      })
    );
  }

  getPlaceById(id: number): Observable<Place> {
    return this.getAllPlaces().pipe(
      map((places) => {
        const place = places.find((p) => p.id === id);
        if (!place) {
          throw new Error(`Place with id ${id} not found`);
        }
        return place;
      })
    );
  }

  /**
   * Find a place by free-text query or coordinates contained in the query.
   * Tries cached places first, then falls back to OpenTripMap radius search
   * around provided coordinates (if any).
   */
  findPlaceByQuery(query: string): Observable<Place | undefined> {
    const coordMatch = query.match(/([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
    const lat = coordMatch ? parseFloat(coordMatch[1]) : undefined;
    const lon = coordMatch ? parseFloat(coordMatch[2]) : undefined;

    // 1) try cached places search
    return this.getAllPlaces().pipe(
      catchError(() => of<Place[]>([])),
      switchMap((places) => {
        const q = query.toLowerCase();
        // exact or substring match on name
        let found = places.find((p) => p.name.toLowerCase() === q || p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
        if (found) return of(found);

        // match by governorate or city fields
        found = places.find((p) => (p.governorate || '').toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q));
        if (found) return of(found);

        // 2) if coords provided, query OpenTripMap radius around coords
        if (lat != null && lon != null && this.openTripMapApiKey) {
          const url = 'https://api.opentripmap.com/0.1/en/places/radius';
          const params: any = {
            apikey: this.openTripMapApiKey,
            lat: String(lat),
            lon: String(lon),
            radius: '2000',
            kinds:
              'historic,monuments_and_memorials,archaeology,egyptian_temples,museums,fortifications,religion',
            rate: '2',
            format: 'json',
            limit: '50'
          };

          return this.http.get<OpenTripMapPlace[]>(url, { params }).pipe(
            catchError(() => of<OpenTripMapPlace[]>([])),
            switchMap((otmPlaces) => {
              const named = otmPlaces.filter((p) => !!p.name && this.allowedKinds.some((k) => p.kinds?.includes(k)));
              const withIds = named.map((p, i) => ({ ...p, internalId: i + 1 }));
              if (!withIds.length) return of(undefined);

              return this.governorateService.getAllGovernorates().pipe(
                catchError(() => of<Governorate[]>([])),
                switchMap((govs) => {
                  const requests = withIds.map((p) => this.enrichWithWikipediaAndGovernorate(p, govs));
                  return forkJoin(requests).pipe(
                    map((placesList) => placesList.filter((p): p is Place => !!p)),
                    map((placesList) => {
                      // try to match by name similarity to the query or pick nearest by distance to coords
                      const qLower = query.toLowerCase();
                      let candidate = placesList.find((pl) => pl.name.toLowerCase() === qLower || pl.name.toLowerCase().includes(qLower) || qLower.includes(pl.name.toLowerCase()));
                      if (candidate) return candidate;

                      // compute nearest to provided coords
                      let best: Place | undefined;
                      let bestDist = Number.MAX_VALUE;
                      for (const pl of placesList) {
                        if (pl.latitude == null || pl.longitude == null) continue;
                        const d = this.haversineDistance(lat!, lon!, pl.latitude, pl.longitude);
                        if (d < bestDist) {
                          bestDist = d;
                          best = pl;
                        }
                      }
                      return best;
                    })
                  );
                })
              );
            })
          );
        }

        // nothing found
        return of(undefined);
      })
    );
  }

  // The following mutation methods are kept for compatibility,
  // but they currently do not integrate with a backend API.
  createPlace(place: Place): Observable<Place> {
    console.warn('createPlace is not implemented for OpenTripMap-backed data.');
    return of(place);
  }

  updatePlace(id: number, place: Place): Observable<Place> {
    console.warn('updatePlace is not implemented for OpenTripMap-backed data.');
    return of(place);
  }

  deletePlace(id: number): Observable<void> {
    console.warn('deletePlace is not implemented for OpenTripMap-backed data.');
    return of(void 0);
  }

  getPlacesByCategory(category: string): Observable<Place[]> {
    return this.getAllPlaces().pipe(
      map((places) =>
        places.filter((p) =>
          (p.category || '').toLowerCase().includes(category.toLowerCase())
        )
      )
    );
  }

  private enrichWithWikipediaAndGovernorate(
    src: OpenTripMapPlace & { internalId: number },
    governorates: Governorate[]
  ): Observable<Place | null> {
    const nearestGov = this.findNearestGovernorate(src.point.lat, src.point.lon, governorates);

    const wikiTitle = encodeURIComponent(src.name);
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`;

    return this.http.get<WikipediaSummary>(wikiUrl).pipe(
      map((summary) => {
        const description =
          summary.extract || 'Tourist attraction in Egypt. Description not available yet.';
        const imageUrl = summary.thumbnail?.source || '';
        const wikipediaLink = summary.content_urls?.desktop?.page || '';

        const place: Place = {
          id: src.internalId,
          xid: src.xid,
          name: src.name || 'No information available for this attraction',
          governorate: nearestGov?.nameEn,
          city: nearestGov?.nameEn ?? '',
          description,
          imageUrl,
          images: imageUrl ? [imageUrl] : undefined,
          latitude: src.point.lat,
          longitude: src.point.lon,
          coordinates: { lat: src.point.lat, lng: src.point.lon },
          category: src.kinds,
          rating: 4.5,
          visitorsPerYear: 0,
          wikipediaLink
        };

        return place;
      }),
      catchError((err) => {
        console.warn('Wikipedia lookup failed for', src.name, err);
        const fallback: Place = {
          id: src.internalId,
          xid: src.xid,
          name: src.name || 'No information available for this attraction',
          governorate: nearestGov?.nameEn,
          city: nearestGov?.nameEn ?? '',
          description: 'Tourist attraction in Egypt.',
          imageUrl: '',
          latitude: src.point.lat,
          longitude: src.point.lon,
          coordinates: { lat: src.point.lat, lng: src.point.lon },
          category: src.kinds,
          rating: 4.5,
          visitorsPerYear: 0
        };
        return of(fallback);
      })
    );
  }

  private findNearestGovernorate(
    lat: number,
    lon: number,
    governorates: Governorate[]
  ): Governorate | undefined {
    if (!governorates.length) return undefined;

    let best: Governorate | undefined = undefined;
    let bestDist = Number.MAX_VALUE;

    for (const gov of governorates) {
      if (!gov.coordinates) continue;
      const d = this.haversineDistance(lat, lon, gov.coordinates.lat, gov.coordinates.lng);
      if (d < bestDist) {
        bestDist = d;
        best = gov;
      }
    }

    return best;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
