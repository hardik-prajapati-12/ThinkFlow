// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  public  currentUser$       = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadUser(): User | null {
    try {
      const u = localStorage.getItem('blog_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get isLoggedIn():  boolean { return !!this.currentUserSubject.value && !!localStorage.getItem('blog_token'); }
  get isAdmin():     boolean { return this.currentUser?.role === 'admin'; }
  get isAuthor():    boolean { return this.currentUser?.role === 'author'; }
  get isAuthorOrAdmin(): boolean { return this.isAdmin || this.isAuthor; }

  register(data: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(tap(r => this.saveSession(r)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(tap(r => this.saveSession(r)));
  }

  logout(): void {
    localStorage.removeItem('blog_token');
    localStorage.removeItem('blog_user');
    this.currentUserSubject.next(null);
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem('blog_token', res.token);
    localStorage.setItem('blog_user', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  getToken(): string | null { return localStorage.getItem('blog_token'); }

  // ── Profile ─────────────────────────────────────────────────
  updateProfile(data: { username: string; bio: string }): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, data).pipe(
      tap(res => {
        localStorage.setItem('blog_user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }

  // ── Avatar ───────────────────────────────────────────────────
  /** Upload or replace profile photo. Sends multipart/form-data. */
  uploadAvatar(file: File): Observable<{ message: string; user: User }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ message: string; user: User }>(`${this.apiUrl}/avatar`, formData).pipe(
      tap(res => {
        localStorage.setItem('blog_user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  /** Remove profile photo — resets avatar to empty string. */
  removeAvatar(): Observable<{ message: string; user: User }> {
    return this.http.delete<{ message: string; user: User }>(`${this.apiUrl}/avatar`).pipe(
      tap(res => {
        localStorage.setItem('blog_user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  // ── Public: Get all authors & admins (for About page) ───────
  getAuthors(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/authors`);
  }

  // ── Admin: User Management ───────────────────────────────────
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: string, role: string): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  toggleUserStatus(userId: string): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/users/${userId}/status`, {});
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${userId}`);
  }
}