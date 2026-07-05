// src/app/services/message.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, MessageStats } from '../models';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private api = 'http://localhost:5000/api/messages';

  constructor(private http: HttpClient) {}

  // ── Public ────────────────────────────────────────────────
  sendMessage(data: { name: string; email: string; topic: string; message: string }
  ): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(this.api, data);
  }

  // ── Admin ─────────────────────────────────────────────────
  getMessages(unreadOnly = false): Observable<Message[]> {
    const params = unreadOnly ? new HttpParams().set('unread', 'true') : undefined;
    return this.http.get<Message[]>(this.api, { params });
  }

  getStats(): Observable<MessageStats> {
    return this.http.get<MessageStats>(`${this.api}/stats`);
  }

  // ← New: sends real email via backend Nodemailer
  sendReply(id: string, subject: string, body: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/reply`, { subject, body });
  }

  toggleRead(id: string): Observable<{ message: string; isRead: boolean }> {
    return this.http.put<{ message: string; isRead: boolean }>(`${this.api}/${id}/read`, {});
  }

  toggleStar(id: string): Observable<{ message: string; isStarred: boolean }> {
    return this.http.put<{ message: string; isStarred: boolean }>(`${this.api}/${id}/star`, {});
  }

  deleteMessage(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  deleteReadMessages(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(this.api);
  }
}