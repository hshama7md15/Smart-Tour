import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Governorate } from '../models/governorate.model';

@Injectable({
  providedIn: 'root'
})
export class GovernorateService {
  private readonly apiUrl = 'src/aassets/data/egypt-governorates.json';
  private cache$?: Observable<Governorate[]>;

  constructor(private http: HttpClient) {}

  getAllGovernorates(): Observable<Governorate[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<Governorate[]>(this.apiUrl)
        .pipe(shareReplay(1));
    }
    return this.cache$;
  }
}
