// src/app/services/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Attach JWT token to every request
    const token = this.auth.getToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // ── 401 Unauthorized: token expired / user deleted ───
        if (error.status === 401) {
          this.auth.logout();          // clear localStorage
          this.router.navigate(['/login'], {
            queryParams: { reason: 'session_expired' }
          });
        }
        // ── 403 Forbidden: wrong role ────────────────────────
        // Don't auto-logout on 403 — just let the component handle it
        return throwError(() => error);
      })
    );
  }
}