// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';   // ← add this line back
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { Post, Category } from '../../models';

@Component({

  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  featuredPosts: Post[] = [];
  posts: Post[]          = [];
  categories: Category[] = [];

  totalPages    = 1;
  currentPage   = 1;
  total         = 0;

  searchQuery      = '';
  selectedCategory = '';
  searchTimeout: any;

  // 'author' | 'category' | 'tag' | 'title' | ''
  searchMatchType = '';

  loadingFeatured = true;
  loadingPosts    = true;

  constructor(private postService: PostService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadFeatured();
    this.loadPosts();
    this.loadCategories();
  }

  loadFeatured(): void {
    this.loadingFeatured = true;
    this.postService.getFeaturedPosts().subscribe({
      next:  posts => { this.featuredPosts = posts; this.loadingFeatured = false; },
      error: ()    => { this.loadingFeatured = false; }
    });
  }

  loadPosts(page = 1): void {
    this.loadingPosts = true;
    this.postService.getPosts(page, 6, this.searchQuery, this.selectedCategory).subscribe({
      next: (res: any) => {
        this.posts           = res.posts;
        this.totalPages      = res.totalPages;
        this.currentPage     = res.currentPage;
        this.total           = res.total;
        this.searchMatchType = res.matchType || '';
        this.loadingPosts    = false;

        // ── Tag search fix ──────────────────────────────────────
        // The backend can incorrectly return matchType='category' when
        // the query is a substring of a category name (e.g. "ai" inside
        // "Entertainment"). We detect this and correct it client-side.
        this.fixTagSearchMismatch();
      },
      error: () => { this.loadingPosts = false; }
    });
  }


  private fixTagSearchMismatch(): void {
    if (!this.searchQuery || !this.posts.length) return;

    const q = this.searchQuery.trim().toLowerCase();

    // ── Check for exact tag matches in returned posts ───────────
    const tagMatchedPosts = this.posts.filter(post =>
      post.tags?.some(tag => tag.toLowerCase() === q)
    );

    if (tagMatchedPosts.length > 0) {
      // We have posts with this exact tag — always prefer tag results
      // over a category substring match
      if (this.searchMatchType !== 'tag') {
        this.posts           = tagMatchedPosts;
        this.total           = tagMatchedPosts.length;
        this.searchMatchType = 'tag';
      }
      return;
    }

    // ── Check for exact category name match (not just substring) ─
    // If matchType='category' but no category name exactly matches
    // the query, the result is a false positive from substring search.
    // In that case clear results so the user sees "No articles found"
    // rather than unrelated posts.
    if (this.searchMatchType === 'category') {
      const hasExactCategoryMatch = this.posts.some(post =>
        post.category?.name?.toLowerCase() === q
      );

      if (!hasExactCategoryMatch) {
        // Substring-only category match — not what the user intended.
        // Show empty state so they know there are no exact results.
        this.posts           = [];
        this.total           = 0;
        this.searchMatchType = '';
      }
    }
  }

  loadCategories(): void {
    this.postService.getCategories().subscribe(cats => this.categories = cats);
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchMatchType = '';          // reset while typing
    this.searchTimeout = setTimeout(() => this.loadPosts(1), 400);
  }

  filterByCategory(catId: string): void {
    this.selectedCategory = this.selectedCategory === catId ? '' : catId;
    this.loadPosts(1);
  }

  clearSearch(): void {
    this.searchQuery      = '';
    this.selectedCategory = '';
    this.searchMatchType  = '';
    this.loadPosts(1);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/default-cover.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  }
}