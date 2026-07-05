// src/app/components/blog-post/blog-post.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { Post, Comment } from '../../models';

@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.css']
})
export class BlogPostComponent implements OnInit, OnDestroy {
  post: Post | null = null;
  formattedContent = '';
  comments: Comment[] = [];
  newComment = '';
  loading = true;
  commentLoading = false;
  liked = false;
  likesCount = 0;
  errorMsg = '';
  successMsg = '';
  linkCopied = false;
  private copyTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.loadPost(params['slug']);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.copyTimeout);
  }

  loadPost(slug: string): void {
    this.loading = true;
    this.postService.getPostBySlug(slug).subscribe({
      next: (post) => {
        this.post             = post;
        this.formattedContent = this.formatContent(post.content);
        this.likesCount       = post.likes.length;
        this.liked            = post.likes.includes(this.auth.currentUser?._id || '');
        this.loading          = false;
        this.loadComments(post._id);
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/']);
      }
    });
  }

  // ── Avatar URL helper ────────────────────────────────────────
  /** Returns a full URL for a user avatar, or empty string for initials fallback */
  getAvatarUrl(avatar?: string): string {
    if (!avatar) return '';
    if (avatar.startsWith('http')) return avatar;
    return `http://localhost:5000${avatar}`;
  }

  // ── Tag navigation ─────────────────────────────────────────
  navigateToTag(tag: string): void {
    const encoded = encodeURIComponent(tag.trim());
    this.router.navigateByUrl('/tag/' + encoded).then(success => {
      if (!success) window.location.href = '/tag/' + encoded;
    });
  }

  // ── Smart content formatter ─────────────────────────────────
  formatContent(content: string): string {
  if (!content) return '';

  const hasHtmlTags = /<(h[1-6]|p|ul|ol|li|blockquote|strong|em|br|hr|table|div|pre|code)[^>]*>/i.test(content);
  if (hasHtmlTags) return content;

  const lines = content.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = 'ul';

  for (let raw of lines) {
    const line = raw.trim();

    if (!line) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      continue;
    }

    const isOrdered = /^\d+\.\s/.test(line);
    const isUnordered = /^[-•*→►▸✓✔·]\s/.test(line);

    const markdownMatch = line.match(/^(#{1,6})\s+(.*)/);
const isColonHeading = /^[A-Z].{2,60}:$/.test(line);    

    if (isOrdered) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${this.escapeHtml(line.replace(/^\d+\.\s+/, ''))}</li>`);

    } else if (isUnordered) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${this.escapeHtml(line.replace(/^[-•*→►▸✓✔·]\s+/, ''))}</li>`);

    } else if (markdownMatch || isColonHeading) {

  if (inList) {
    result.push(`</${listType}>`);
    inList = false;
  }

  let tag = 'h2';
  let text = line;

  // Markdown headings
  if (markdownMatch) {
    const level = markdownMatch[1].length;
    text = markdownMatch[2];

    if (level === 1) tag = 'h2';   // main section
    else if (level === 2) tag = 'h3';
    else tag = 'h4';
  } 
  // Colon headings
  else {
    tag = 'h2';
  }

  result.push(`<${tag}>${this.escapeHtml(text)}</${tag}>`);
}
    else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }

      result.push(`<p>${this.escapeHtml(line)}</p>`);
    }
  }

  if (inList) result.push(`</${listType}>`);

  return result.join('\n');
}
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  loadComments(postId: string): void {
    this.postService.getComments(postId).subscribe(c => this.comments = c);
  }

  toggleLike(): void {
    if (!this.auth.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.postService.likePost(this.post!._id).subscribe(res => {
      this.likesCount = res.likes;
      this.liked      = res.liked;
    });
  }

  submitComment(): void {
    if (!this.newComment.trim()) return;
    if (!this.auth.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.commentLoading = true;
    this.postService.addComment(this.post!._id, this.newComment).subscribe({
      next: (res) => {
        this.comments.unshift(res.comment);
        this.newComment     = '';
        this.commentLoading = false;
        this.successMsg     = 'Comment posted!';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.errorMsg       = err.error?.message || 'Failed to post comment';
        this.commentLoading = false;
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  deleteComment(id: string): void {
    this.postService.deleteComment(id).subscribe(() => {
      this.comments = this.comments.filter(c => c._id !== id);
    });
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.linkCopied = true;
      clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.linkCopied = false, 2500);
    });
  }

  shareOn(platform: string): void {
    const url   = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.post?.title || 'Check this out on ThinkFlow');
    const map: { [k: string]: string } = {
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${title}`,
    };
    if (map[platform]) window.open(map[platform], '_blank', 'width=600,height=500,noopener,noreferrer');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getImageUrl(path: string): string {
    if (!path) return 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000${path}`;
  }
}