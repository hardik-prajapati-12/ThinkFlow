import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SocialLink } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = 'http://localhost:5000/api/settings';

  constructor(private http: HttpClient) {}

  getSocialLinks(): Observable<SocialLink[]> {
    return this.http.get<SocialLink[]>(`${this.api}/social-links`);
  }

  updateSocialLinks(socialLinks: SocialLink[]): Observable<{ message: string; socialLinks: SocialLink[] }> {
    return this.http.put<{ message: string; socialLinks: SocialLink[] }>(`${this.api}/social-links`, { socialLinks });
  }
}
