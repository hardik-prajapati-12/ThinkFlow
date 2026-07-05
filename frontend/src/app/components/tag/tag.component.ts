// src/app/components/tag/tag.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PostService } from '../../services/post.service';
import { Post } from '../../models';

@Component({
  selector: 'app-tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.css']
})
export class TagComponent implements OnInit, OnDestroy {
  tagName       = '';
  posts:         Post[]   = [];
  popularPosts:  Post[]   = [];
  allTags:       string[] = [];
  totalPages    = 1;
  currentPage   = 1;
  total         = 0;
  loading       = true;
  sortBy:       'newest' | 'popular' = 'newest';

  private sub!: Subscription;

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private postService: PostService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      const raw    = params['tag'] || '';
      this.tagName = decodeURIComponent(raw);
      this.sortBy  = 'newest';
      this.currentPage = 1;
      this.posts   = [];
      this.loading = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.loadPosts(1);
      this.loadPopular();
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  loadPosts(page: number): void {
    this.loading = true;
    this.postService.getPosts(page, 8, '', '', this.tagName).subscribe({
      next: (res) => {
        this.posts       = res.posts;
        this.totalPages  = res.totalPages;
        this.currentPage = res.currentPage;
        this.total       = res.total;
        this.loading     = false;

        // Collect related tags (exclude current tag)
        const tagSet = new Set<string>();
        res.posts.forEach(p => p.tags?.forEach(t => {
          if (t.toLowerCase() !== this.tagName.toLowerCase()) tagSet.add(t);
        }));
        this.allTags = Array.from(tagSet).slice(0, 12);

        if (this.sortBy === 'popular') {
          this.posts = [...this.posts].sort((a, b) => b.views - a.views);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  loadPopular(): void {
    this.postService.getFeaturedPosts().subscribe({
      next:  (posts) => this.popularPosts = posts,
      error: () => {}
    });
  }

  setSort(sort: 'newest' | 'popular'): void {
    this.sortBy = sort;
    if (sort === 'popular') {
      this.posts = [...this.posts].sort((a, b) => b.views - a.views);
    } else {
      this.posts = [...this.posts].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }

  // Navigate to a page using Router — no routerLink needed
  goTo(path: string): void {
    this.router.navigateByUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Navigate to a tag page — stops event bubbling (card click)
  goToTag(tag: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tag', tag]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  getImageUrl(path: string): string {
    if (!path) return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000${path}`;
  }
}