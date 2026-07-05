// src/app/components/navbar/navbar.component.ts
import { Component, OnInit, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  user: User | null = null;
  isScrolled = false;
  menuOpen = false;
  dropdownOpen = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private elRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => this.user = u);

    // ✅ Auto-close on every navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.dropdownOpen = false;
        this.menuOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const userMenuEl = this.elRef.nativeElement.querySelector('.user-menu');
    if (userMenuEl && !userMenuEl.contains(event.target as Node)) {
      this.dropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
    this.cdr.detectChanges();
  }

  logout(): void {
    this.dropdownOpen = false;
    this.menuOpen = false;
    this.auth.logout();
    this.router.navigate(['/']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}