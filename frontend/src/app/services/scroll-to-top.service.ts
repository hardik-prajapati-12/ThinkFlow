// src/app/services/scroll-to-top.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ScrollToTopService {
  constructor(private router: Router) {}

  /** Call once from AppComponent.ngOnInit() */
  init(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Instant scroll — no smooth so page feels snappy on route change
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      });
  }
}
