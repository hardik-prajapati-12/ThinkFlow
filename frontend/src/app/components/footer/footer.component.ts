// src/app/components/footer/footer.component.ts
import { Component, OnInit } from '@angular/core';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Category, SocialLink } from '../../models';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  year       = new Date().getFullYear();
  categories: Category[] = [];
  socialLinks: SocialLink[] = [
    { label: 'Twitter / X', icon: 'fi fi-brands-twitter', url: 'https://twitter.com', isActive: true },
    { label: 'LinkedIn', icon: 'fi fi-brands-linkedin', url: 'https://linkedin.com', isActive: true },
    { label: 'GitHub', icon: 'fi fi-brands-github', url: 'https://github.com', isActive: true },
    { label: 'Contact Us', icon: 'fi fi-rr-envelope', url: '/contact', isActive: true }
  ];

  constructor(
    private postService:     PostService,
    private settingsService: SettingsService,
    public  auth:        AuthService,
    private router:      Router
  ) {}

  ngOnInit(): void {
    this.postService.getCategories().subscribe({
      next:  (cats) => this.categories = cats,
      error: ()     => { /* silently ignore - footer still renders */ }
    });

    this.settingsService.getSocialLinks().subscribe({
      next:  (links) => this.socialLinks = links.filter(link => link.isActive && link.url && link.url.trim() !== ''),
      error: ()      => { /* keep default links */ }
    });
  }

  isInternalLink(url: string): boolean {
    return url.startsWith('/');
  }

  getIconClass(link: SocialLink): string {
    if (link.icon && link.icon.startsWith('fi ')) {
      return link.icon;
    }
    const label = (link.label || '').toLowerCase();
    const icon = (link.icon || '').toLowerCase();
    
    if (label.includes('twitter') || label.includes('x') || icon === 'x') {
      return 'fi fi-brands-twitter';
    }
    if (label.includes('linkedin') || icon === 'in') {
      return 'fi fi-brands-linkedin';
    }
    if (label.includes('github') || icon === 'gh') {
      return 'fi fi-brands-github';
    }
    if (label.includes('facebook') || icon === 'f') {
      return 'fi fi-brands-facebook';
    }
    if (label.includes('instagram') || icon === 'ig') {
      return 'fi fi-brands-instagram';
    }
    if (label.includes('youtube') || icon === 'yt') {
      return 'fi fi-brands-youtube';
    }
    if (label.includes('contact') || label.includes('email') || icon === '@') {
      return 'fi fi-rr-envelope';
    }
    return 'fi fi-rr-link';
  }

  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

