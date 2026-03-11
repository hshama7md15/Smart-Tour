export interface Place {
  id: number;
  name: string;
  city: string;
  description: string;
  historicalInfo?: string;
  imageUrl: string;
  /** Optional array of image URLs when multiple images are available */
  images?: string[];
  latitude?: number;
  longitude?: number;
  category: string;
  rating: number;
  visitorsPerYear: number;
  governorate?: string;
  /** OpenTripMap external id (xid) when available */
  xid?: string;
  /** Link to a Wikipedia page (resolved at enrichment time) */
  wikipediaLink?: string;
  // some sources use a nested coordinates object
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  // used at runtime for sorting/display only
  distanceKm?: number;
}
