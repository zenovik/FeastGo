import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config';
import { ExploreCard } from '../models/explore-card.model';

@Injectable({ providedIn: 'root' })
export class ExploreCardService {
  constructor(private http: HttpClient) {}

  list() {
    return firstValueFrom(this.http.get<{ cards: ExploreCard[] }>(`${API_URL}/explore-cards`));
  }
}
