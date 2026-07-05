// src/app/components/legal/legal.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type LegalTab = 'privacy' | 'terms' | 'cookies' | 'sitemap';

@Component({
  selector: 'app-legal',
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.css']
})
export class LegalComponent implements OnInit {
  activeTab: LegalTab = 'privacy';

  tabs: { id: LegalTab; label: string; icon: string }[] = [
    { id: 'privacy',  label: 'Privacy Policy',   icon: '🔒' },
    { id: 'terms',    label: 'Terms of Service',  icon: '📄' },
    { id: 'cookies',  label: 'Cookie Policy',     icon: '🍪' },
    { id: 'sitemap',  label: 'Sitemap',           icon: '🗺' },
  ];

  // Static sections — auth-dependent links are handled in the template
  sitemapSections = [
    {
      section: 'Categories',
      links: [
        { label: 'Technology', path: '/category/technology' },
        { label: 'Design',     path: '/category/design' },
        { label: 'Lifestyle',  path: '/category/lifestyle' },
        { label: 'Business',   path: '/category/business' },
        { label: 'Science',    path: '/category/science' },
      ]
    },
    {
      section: 'Legal',
      links: [
        { label: 'Privacy Policy',   path: '/legal/privacy' },
        { label: 'Terms of Service', path: '/legal/terms' },
        { label: 'Cookie Policy',    path: '/legal/cookies' },
      ]
    },
  ];

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    public  auth:   AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const tab = params['tab'] as LegalTab;
      this.activeTab = (tab && this.tabs.find(t => t.id === tab)) ? tab : 'privacy';
    });
  }

  switchTab(tab: LegalTab): void {
    this.activeTab = tab;
    this.router.navigate(['/legal', tab], { replaceUrl: true });
  }

  getLastUpdated(): string {
    return 'March 25, 2026';
  }
}