import { Place } from './place.model';

export interface Recommendation {
  id: number;
  userId: number;
  place: Place;
  score: number;
  reason: string;
}
