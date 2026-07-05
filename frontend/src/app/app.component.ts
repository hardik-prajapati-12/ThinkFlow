// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { ScrollToTopService } from './services/scroll-to-top.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <app-navbar></app-navbar>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
    <app-footer *ngIf="showFooter"></app-footer>
  `,
  styles: [`
    .main-content {
      min-height: calc(100vh - 72px);
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'ThinkFlow';
  showFooter = true;

  constructor(
    private scrollToTop: ScrollToTopService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Register the global scroll-to-top listener once on app start
    this.scrollToTop.init();

    // Show/hide footer based on routing path (hidden in admin and auth panels)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.showFooter = !url.startsWith('/admin') && !url.startsWith('/login') && !url.startsWith('/reset-password');
    });
  }
}