// src/app/components/category/category.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PostService } from '../../services/post.service';
import { Post, Category } from '../../models';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {
  category: Category | null = null;
  posts: Post[] = [];
  totalPages = 1;
  currentPage = 1;
  total = 0;
  loading = true;

  constructor(private route: ActivatedRoute, private postService: PostService) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Find category by slug then load posts
      this.postService.getCategories().subscribe(cats => {
        this.category = cats.find((c: Category) => c.slug === params['slug']) || null;
        if (this.category) this.loadPosts();
        else this.loading = false;
      });
    });
  }

  loadPosts(page = 1): void {
    this.loading = true;
    this.postService.getPosts(page, 6, '', this.category!._id).subscribe({
      next: (res) => {
        this.posts = res.posts;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage;
        this.total = res.total;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  getImageUrl(path: string): string {
    if (!path) return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000${path}`;
  }
}
