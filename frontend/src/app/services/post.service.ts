// src/app/services/post.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post, PostsResponse, Comment, CommentStats } from '../models';

@Injectable({ providedIn: 'root' })
export class PostService {
  private api = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // ── Public Posts ───────────────────────────────────────────
  getPosts(page = 1, limit = 6, search = '', category = '', tag = ''): Observable<PostsResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search)   params = params.set('search', search);
    if (category) params = params.set('category', category);
    if (tag)      params = params.set('tag', tag);
    return this.http.get<PostsResponse>(`${this.api}/posts`, { params });
  }

  getFeaturedPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/posts/featured`);
  }

  getPostBySlug(slug: string): Observable<Post> {
    return this.http.get<Post>(`${this.api}/posts/${slug}`);
  }

  // ── Admin: all posts ───────────────────────────────────────
  getAllPostsAdmin(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/posts/admin/all`);
  }

  // ── Author: only their own posts ───────────────────────────
  getMyPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/posts/my-posts`);
  }

  // ── Create / Update / Delete ───────────────────────────────
  createPost(formData: FormData): Observable<{ message: string; post: Post }> {
    return this.http.post<{ message: string; post: Post }>(`${this.api}/posts`, formData);
  }

  updatePost(id: string, formData: FormData): Observable<{ message: string; post: Post }> {
    return this.http.put<{ message: string; post: Post }>(`${this.api}/posts/${id}`, formData);
  }

  deletePost(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/posts/${id}`);
  }

  likePost(id: string): Observable<{ likes: number; liked: boolean }> {
    return this.http.post<{ likes: number; liked: boolean }>(`${this.api}/posts/${id}/like`, {});
  }

  // ── Comments ───────────────────────────────────────────────
  getComments(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.api}/comments/${postId}`);
  }

  getAllCommentsByPost(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.api}/comments/post/${postId}/all`);
  }

  addComment(postId: string, content: string): Observable<{ message: string; comment: Comment }> {
    return this.http.post<{ message: string; comment: Comment }>(`${this.api}/comments`, { postId, content });
  }

  toggleHideComment(commentId: string): Observable<{ message: string; isApproved: boolean }> {
    return this.http.put<{ message: string; isApproved: boolean }>(`${this.api}/comments/${commentId}/hide`, {});
  }

  deleteComment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/comments/${id}`);
  }

  getManagedComments(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.api}/comments/manage`);
  }

  getCommentStats(): Observable<CommentStats> {
    return this.http.get<CommentStats>(`${this.api}/comments/manage/stats`);
  }

  hideComment(id: string): Observable<{ message: string; isApproved: boolean }> {
    return this.http.put<{ message: string; isApproved: boolean }>(`${this.api}/comments/${id}/hide`, {});
  }

  // ── Categories ─────────────────────────────────────────────
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/categories`);
  }

  createCategory(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/categories`, data);
  }

  // ✅ NEW: Update an existing category
  updateCategory(id: string, data: any): Observable<{ message: string; category: any }> {
    return this.http.put<{ message: string; category: any }>(`${this.api}/categories/${id}`, data);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/categories/${id}`);
  }
}