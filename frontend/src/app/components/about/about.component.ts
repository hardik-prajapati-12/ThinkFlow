// src/app/components/about/about.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { User } from '../../models';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  // ── Team (live from API) ─────────────────────────────────
  team: User[] = [];
  teamLoading = true;
  teamError = '';
  postCounts: { [id: string]: number } = {};

  // ── Stats (live from API) ────────────────────────────────
  totalReaders = 0;
  statsLoaded = false;
  monthlyReaders = 0;

  values = [
    { icon: '✍', title: 'Authentic Voice', desc: 'We write with honesty, clarity, and genuine passion for every topic.' },
    { icon: '🔍', title: 'Deep Research', desc: 'Every article is backed by thorough research and multiple perspectives.' },
    { icon: '🌍', title: 'Global Reach', desc: 'Our readers span 60+ countries — diverse voices, one community.' },
    { icon: '💡', title: 'Fresh Ideas', desc: 'We challenge conventional thinking and explore new frontiers.' },
    { icon: '🤝', title: 'Community First', desc: 'Comments, discussions, and reader contributions shape our content.' },
    { icon: '♻', title: 'Always Free', desc: 'Knowledge should be accessible to everyone, forever.' },
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private postService: PostService
  ) { }

  ngOnInit(): void {
    this.loadTeam();
    this.loadStats();
  }

  // ── Getters ──────────────────────────────────────────────
  get teamMembers(): User[] { return this.team; }
  get totalAuthors(): number { return this.team.length; }
  get totalPosts(): number {
    return Object.values(this.postCounts).reduce((s, c) => s + c, 0);
  }

  // ── CTA button — role-aware routing ─────────────────────
  /**
   * Admin / Author  →  /create-post  (the new post editor)
   * Logged-in subscriber  →  /contact?ref=become-author
   *   (contact page shows a "become an author" banner)
   * Not logged in  →  /login
   */
  startWriting(): void {
    const user = this.authService.currentUser;

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const role = (user.role ?? '').toLowerCase();

    if (role === 'admin' || role === 'author') {
      this.router.navigate(['/admin'], { queryParams: { tab: 'create' } });
    } else {
      // subscriber or any other role → guide them to contact page
      this.router.navigate(['/contact'], { queryParams: { ref: 'become-author' } });
    }
  }

  // ── Data loaders ─────────────────────────────────────────
  loadTeam(): void {
    this.teamLoading = true;
    this.teamError = '';
    this.authService.getAuthors().subscribe({
      next: (authors) => {
        this.team = authors;
        this.teamLoading = false;
        this.loadPostCounts();
      },
      error: () => {
        this.teamLoading = false;
        this.teamError = 'Could not load team members.';
      }
    });
  }

  loadStats(): void {
    this.http.get<any>('https://thinkflow-ki0r.onrender.com/api/posts/stats').subscribe({
      next: (data) => { this.monthlyReaders = data.monthlyReaders || 0; this.statsLoaded = true; },
      error: () => { this.monthlyReaders = 0; this.statsLoaded = true; }
    });
  }

  loadPostCounts(): void {
    this.postService.getPosts(1, 100).subscribe({
      next: (res) => {
        const counts: { [id: string]: number } = {};
        res.posts.forEach(post => {
          const id = post.author._id;
          counts[id] = (counts[id] || 0) + 1;
        });
        this.postCounts = counts;
      },
      error: () => { }
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  getInitials(username: string): string {
    return username.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  getRoleLabel(role: string): string {
    return role === 'admin' ? 'Founder & Editor' : 'Author';
  }

  getRoleClass(role: string): string {
    return role === 'admin' ? 'role-admin' : 'role-author';
  }

  getMemberBio(user: User): string {
    return user.bio && user.bio.trim() ? user.bio : 'Writer & contributor at ThinkFlow.';
  }

  getPostCount(userId: string): number {
    return this.postCounts[userId] || 0;
  }

  getAvatarUrl(avatar: string | undefined): string | null {
    if (!avatar || avatar.trim() === '') return null;
    if (avatar.startsWith('http')) return avatar;
    return `https://thinkflow-ki0r.onrender.com${avatar}`;
  }

  getMemberSince(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatReaders(n: number): string {
    if (n === 0) return '0';
    if (n < 1000) return n.toString();
    if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Math.floor(n / 1000) + 'K+';
  }
}