// src/app/components/admin/admin.component.ts
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { PostService }    from '../../services/post.service';
import { AuthService }    from '../../services/auth.service';
import { MessageService } from '../../services/message.service';
import { SettingsService } from '../../services/settings.service';
import { Post, Category, User, Message, MessageStats, Comment, CommentStats, SocialLink } from '../../models';

type AdminTab = 'overview' | 'posts' | 'create' | 'categories' | 'users' | 'comments' | 'messages' | 'social';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: AdminTab = 'overview';

  // Data
  posts:            Post[]        = [];
  categories:       Category[]    = [];
  users:            User[]        = [];
  messages:         Message[]     = [];
  filteredMessages: Message[]     = [];
  msgFilter:        'all' | 'unread' | 'starred' = 'all';
  socialLinks:      SocialLink[]  = [];
  comments:         Comment[]     = [];
  filteredComments: Comment[]     = [];

  // Predefined social platforms with brand/vector icons
  PREDEFINED_SOCIALS = [
    { label: 'Twitter / X', icon: 'fi fi-brands-twitter' },
    { label: 'LinkedIn',    icon: 'fi fi-brands-linkedin' },
    { label: 'GitHub',      icon: 'fi fi-brands-github' },
    { label: 'Facebook',    icon: 'fi fi-brands-facebook' },
    { label: 'Instagram',   icon: 'fi fi-brands-instagram' },
    { label: 'YouTube',     icon: 'fi fi-brands-youtube' }
  ];

  // Stats
  msgStats:     MessageStats = { total: 0, unread: 0, starred: 0 };
  commentStats: CommentStats = { total: 0, visible: 0, hidden: 0 };

  // Loading flags
  loading          = false;
  saving           = false;
  usersLoading     = false;
  msgsLoading      = false;
  commentsLoading  = false;
  socialLoading    = false;
  socialSaving     = false;
  errorMsg         = '';
  successMsg       = '';

  // Posts
  editingPost:     Post | null = null;
  postForm!:       FormGroup;
  categoryForm!:   FormGroup;
  socialForm!:     FormGroup;
  selectedFile:    File | null = null;
  previewUrl       = '';
  removeCoverImage = false;

  // ── Category editing ──────────────────────────────────────
  editingCategory:     Category | null = null;   // which category is being edited
  editCategoryForm!:   FormGroup;                // reactive form for inline edit
  savingCategory       = false;                  // spinner while PUT request is in flight

  // Users
  editingUserId:   string | null = null;
  editingUserRole: string = 'user';

  // Messages
  showUnreadOnly   = false;
  selectedMessage: Message | null = null;
  showReplyModal   = false;
  replySubject     = '';
  replyBody        = '';
  replySending     = false;
  replyError       = '';
  replySuccess     = '';

  // Overview
  overviewStats:  any = null;
  overviewLoading = false;
  recentPosts:    any[] = [];
  topPosts:       any[] = [];

  // Author Insights
  authorInsights: any = null;
  insightsLoading = false;

  // Comments
  commentFilter: 'all' | 'visible' | 'hidden' = 'all';
  commentSearch  = '';
  commentSearchTimeout: any;

  constructor(
  private fb:             FormBuilder,
  private postService:    PostService,
  public  auth:           AuthService,
  private http:           HttpClient,
  private router:         Router,
  private route:          ActivatedRoute,
  private messageService: MessageService,
  private settingsService: SettingsService
) {}

  // AFTER — ngOnInit
ngOnInit(): void {
  this.initForms();
  this.verifyRoleFromServer();
}

  verifyRoleFromServer(): void {
  this.http.get<{ user: User }>('http://localhost:5000/api/auth/me').subscribe({
    next: (res) => {
      if (res.user.role !== this.auth.currentUser?.role) {
        localStorage.setItem('blog_user', JSON.stringify(res.user));
        window.location.reload();
        return;
      }
      this.loadData();
      this.applyTabFromQueryParam();   // ← read param AFTER role is verified
    },
    error: () => {
      this.loadData();
      this.applyTabFromQueryParam();   // ← same here
    }
  });
}
private applyTabFromQueryParam(): void {
  this.route.queryParams.subscribe(params => {
    const tab = params['tab'] as AdminTab;
    const validTabs: AdminTab[] = ['overview', 'posts', 'create', 'categories', 'users', 'comments', 'messages', 'social'];
    if (tab && validTabs.includes(tab)) {
      this.switchTab(tab);
    } else {
      this.activeTab = 'overview';
    }
  });
}
  loadData(): void {
    this.loadPosts();
    if (this.auth.isAdmin) {
      this.loadCategories();
      this.loadUsers();
      this.loadMsgStats();
      this.loadOverview();
      this.loadSocialLinks();
    }
    if (this.auth.isAuthor) { this.loadAuthorInsights(); }
    this.loadCommentStats();
  }

  initForms(): void {
    this.postForm = this.fb.group({
      title:    ['', [Validators.required, Validators.minLength(5)]],
      content:  ['', [Validators.required, Validators.minLength(20)]],
      excerpt:  [''],
      category: [''],
      tags:     [''],
      status:   ['draft']
    });

    this.categoryForm = this.fb.group({
      name:        ['', Validators.required],
      description: [''],
      icon:        ['📝'],
      color:       ['#D4A853']
    });

    // Separate reactive form for editing an existing category
    this.editCategoryForm = this.fb.group({
      name:        ['', Validators.required],
      description: [''],
      icon:        ['📝'],
      color:       ['#D4A853']
    });

    this.socialForm = this.fb.group({
      socialLinks: this.fb.array([])
    });
  }

  // ── Overview ──────────────────────────────────────────────
  loadOverview(): void {
    this.overviewLoading = true;
    this.http.get<any>('http://localhost:5000/api/stats/overview').subscribe({
      next: (data) => {
        this.overviewStats   = data;
        this.topPosts        = data.topPosts || [];
        this.recentPosts     = data.recentPosts || [];
        this.overviewLoading = false;
      },
      error: () => { this.overviewLoading = false; }
    });
  }

  // ── Author Insights ───────────────────────────────────────
  loadAuthorInsights(): void {
    this.insightsLoading = true;
    this.postService.getMyPosts().subscribe({
      next: (posts) => {
        const published  = posts.filter(p => p.status === 'published');
        const drafts     = posts.filter(p => p.status === 'draft');
        const totalViews = published.reduce((s, p) => s + (p.views || 0), 0);
        const totalLikes = published.reduce((s, p) => s + (p.likes?.length || 0), 0);
        const avgViews   = published.length ? Math.round(totalViews / published.length) : 0;
        const topPosts   = [...published].sort((a, b) => b.views - a.views).slice(0, 5);
        const recentPosts = [...posts].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);
        this.authorInsights  = { published: published.length, drafts: drafts.length, totalViews, totalLikes, avgViews, topPosts, recentPosts };
        this.insightsLoading = false;
      },
      error: () => { this.insightsLoading = false; }
    });
  }

  // ── Posts ──────────────────────────────────────────────────
  loadPosts(): void {
    this.loading = true; this.errorMsg = '';
    const req = this.auth.isAdmin ? this.postService.getAllPostsAdmin() : this.postService.getMyPosts();
    req.subscribe({
      next:  (posts) => { this.posts = posts; this.loading = false; },
      error: (err)   => { this.loading = false; this.errorMsg = `⚠ ${err.error?.message || err.message}`; }
    });
  }

  loadCategories(): void {
    this.postService.getCategories().subscribe({
      next:  (cats) => this.categories = cats,
      error: () => {}
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.auth.getAllUsers().subscribe({
      next:  (users) => { this.users = users; this.usersLoading = false; },
      error: (err)   => { this.usersLoading = false; this.errorMsg = `⚠ ${err.error?.message || err.message}`; }
    });
  }

  // ── Comments ───────────────────────────────────────────────
  loadSocialLinks(): void {
    this.socialLoading = true;
    this.settingsService.getSocialLinks().subscribe({
      next: (links) => {
        this.socialLinks = links;
        this.setSocialLinksForm(links);
        this.socialLoading = false;
      },
      error: (err) => {
        this.socialLoading = false;
        this.errorMsg = err.error?.message || 'Failed to load social links.';
      }
    });
  }

  get socialLinksArray(): FormArray {
    return this.socialForm.get('socialLinks') as FormArray;
  }

  createSocialLinkGroup(link?: Partial<SocialLink>): FormGroup {
    return this.fb.group({
      label:    [link?.label || '', [Validators.required, Validators.maxLength(40)]],
      icon:     [link?.icon || ''],
      url:      [link?.url || '', [Validators.pattern(/^(https?:\/\/|mailto:|tel:|\/(?!\/)).+/i)]],
      isActive: [link?.isActive !== false]
    });
  }

  setSocialLinksForm(links: SocialLink[]): void {
    this.socialLinksArray.clear();
    this.PREDEFINED_SOCIALS.forEach(pre => {
      const saved = links.find(l => l.label.toLowerCase() === pre.label.toLowerCase());
      this.socialLinksArray.push(this.createSocialLinkGroup({
        label: pre.label,
        icon: pre.icon,
        url: saved?.url || '',
        isActive: saved ? saved.isActive !== false : false
      }));
    });
  }

  clearSocialLink(index: number): void {
    const group = this.socialLinksArray.at(index);
    group.patchValue({
      url: '',
      isActive: false
    });
  }


  getSocialDomain(linkOrUrl: Partial<SocialLink> | string): string {
    const rawUrl = typeof linkOrUrl === 'string' ? linkOrUrl : (linkOrUrl.url || '');
    const label = typeof linkOrUrl === 'string' ? '' : (linkOrUrl.label || '');
    const source = `${rawUrl} ${label}`.toLowerCase();

    if (source.includes('twitter.com') || source.includes('x.com') || source.includes('twitter') || /^x\b/.test(label.toLowerCase())) return 'x.com';
    if (source.includes('linkedin')) return 'linkedin.com';
    if (source.includes('github')) return 'github.com';
    if (source.includes('instagram')) return 'instagram.com';
    if (source.includes('facebook') || source.includes('fb.com')) return 'facebook.com';
    if (source.includes('youtube') || source.includes('youtu.be')) return 'youtube.com';
    if (source.includes('telegram')) return 'telegram.org';
    if (source.includes('mailto:') || source.includes('email') || source.includes('contact')) return '';

    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  getSocialIconUrl(linkOrUrl: Partial<SocialLink> | string): string {
    const domain = this.getSocialDomain(linkOrUrl);
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
  }

  getSocialFallbackIcon(linkOrUrl: Partial<SocialLink> | string): string {
    const rawUrl = typeof linkOrUrl === 'string' ? linkOrUrl : (linkOrUrl.url || '');
    const label = typeof linkOrUrl === 'string' ? '' : (linkOrUrl.label || '');
    const source = `${rawUrl} ${label}`.toLowerCase();

    if (source.includes('linkedin')) return 'in';
    if (source.includes('github')) return 'GH';
    if (source.includes('instagram')) return 'IG';
    if (source.includes('facebook') || source.includes('fb.com')) return 'f';
    if (source.includes('youtube') || source.includes('youtu.be')) return 'YT';
    if (source.includes('telegram')) return 'TG';
    if (source.includes('mailto:') || source.includes('email') || source.includes('contact')) return '@';
    if (source.includes('twitter.com') || source.includes('x.com') || source.includes('twitter') || label.trim().toLowerCase() === 'x') return 'X';

    return (label || rawUrl || 'Link').trim().charAt(0).toUpperCase();
  }
  removeSocialLink(index: number): void {
    if (this.socialLinksArray.length <= 1) {
      this.errorMsg = 'At least one social link is required.';
      return;
    }
    this.socialLinksArray.removeAt(index);
  }

  saveSocialLinks(): void {
    if (this.socialForm.invalid) {
      this.socialForm.markAllAsTouched();
      return;
    }

    this.socialSaving = true;
    this.clearMessages();
    const socialLinks = this.socialLinksArray.value.map((link: SocialLink) => ({
      label: link.label.trim(),
      icon: link.icon || 'fi fi-rr-link',
      url: link.url.trim(),
      isActive: link.isActive !== false
    }));

    this.settingsService.updateSocialLinks(socialLinks).subscribe({
      next: (res) => {
        this.socialSaving = false;
        this.socialLinks = res.socialLinks;
        this.setSocialLinksForm(res.socialLinks);
        this.successMsg = res.message;
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.socialSaving = false;
        this.errorMsg = err.error?.message || 'Failed to update social links.';
      }
    });
  }
  loadComments(): void {
    this.commentsLoading = true;
    this.postService.getManagedComments().subscribe({
      next: (comments) => {
        this.comments        = comments;
        this.commentsLoading = false;
        this.applyCommentFilter();
      },
      error: (err) => { this.commentsLoading = false; this.errorMsg = `⚠ ${err.error?.message || err.message}`; }
    });
  }

  loadCommentStats(): void {
    this.postService.getCommentStats().subscribe({
      next:  (stats) => this.commentStats = stats,
      error: () => {}
    });
  }

  applyCommentFilter(): void {
    let list = [...this.comments];
    if (this.commentFilter === 'visible') list = list.filter(c => c.isApproved);
    if (this.commentFilter === 'hidden')  list = list.filter(c => !c.isApproved);
    const q = this.commentSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.content.toLowerCase().includes(q) ||
        c.author.username.toLowerCase().includes(q) ||
        (c as any).post?.title?.toLowerCase().includes(q)
      );
    }
    this.filteredComments = list;
  }

  onCommentSearch(): void {
    clearTimeout(this.commentSearchTimeout);
    this.commentSearchTimeout = setTimeout(() => this.applyCommentFilter(), 300);
  }

  setCommentFilter(f: 'all' | 'visible' | 'hidden'): void {
    this.commentFilter = f;
    this.applyCommentFilter();
  }

  toggleHideComment(comment: Comment): void {
    this.postService.hideComment(comment._id).subscribe({
      next: (res) => {
        comment.isApproved = res.isApproved;
        if (res.isApproved) { this.commentStats.visible++; this.commentStats.hidden--; }
        else                { this.commentStats.hidden++;  this.commentStats.visible--; }
        this.applyCommentFilter();
        this.successMsg = res.message;
        setTimeout(() => this.successMsg = '', 2500);
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to update comment.'; }
    });
  }

  deleteComment(id: string): void {
    if (!confirm('Delete this comment permanently?')) return;
    this.postService.deleteComment(id).subscribe({
      next: () => {
        this.comments            = this.comments.filter(c => c._id !== id);
        this.commentStats.total  = Math.max(0, this.commentStats.total - 1);
        this.applyCommentFilter();
        this.successMsg = 'Comment deleted.';
        setTimeout(() => this.successMsg = '', 2500);
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Delete failed.'; }
    });
  }

  getPostTitle(comment: Comment): string { return (comment as any).post?.title || 'Unknown post'; }
  getPostSlug(comment: Comment):  string { return (comment as any).post?.slug  || ''; }

  // ── Messages ───────────────────────────────────────────────
  loadMessages(): void {
    this.msgsLoading = true;
    this.messageService.getMessages(false).subscribe({
      next:  (msgs) => {
        this.messages = msgs;
        this.msgsLoading = false;
        this.applyMsgFilter();
      },
      error: (err)  => { this.msgsLoading = false; this.errorMsg = `⚠ ${err.error?.message || err.message}`; }
    });
  }

  loadMsgStats(): void {
    this.messageService.getStats().subscribe({
      next:  (s) => this.msgStats = s,
      error: () => {}
    });
  }

  applyMsgFilter(): void {
    let list = [...this.messages];
    if (this.msgFilter === 'unread') {
      list = list.filter(m => !m.isRead);
    } else if (this.msgFilter === 'starred') {
      list = list.filter(m => m.isStarred);
    }
    this.filteredMessages = list;
  }

  setMsgFilter(f: 'all' | 'unread' | 'starred'): void {
    this.msgFilter = f;
    this.applyMsgFilter();
  }

  openMessage(msg: Message): void {
    this.selectedMessage = msg;
    this.closeReplyModal();
    if (!msg.isRead) {
      this.messageService.toggleRead(msg._id).subscribe(() => {
        msg.isRead           = true;
        // ✅ Decrement unread badge — hides automatically in template when it hits 0
        this.msgStats.unread = Math.max(0, this.msgStats.unread - 1);
        this.applyMsgFilter();
      });
    }
  }

  closeMessage(): void { this.selectedMessage = null; this.closeReplyModal(); }

  toggleRead(msg: Message, event: Event): void {
    event.stopPropagation();
    this.messageService.toggleRead(msg._id).subscribe(res => {
      const wasRead    = msg.isRead;
      msg.isRead       = res.isRead;
      // ✅ Keep unread badge count accurate on manual toggle
      this.msgStats.unread = Math.max(0, this.msgStats.unread + (wasRead ? 1 : -1));
      this.applyMsgFilter();
    });
  }

  toggleStar(msg: Message, event: Event): void {
    event.stopPropagation();
    this.messageService.toggleStar(msg._id).subscribe(res => {
      msg.isStarred         = res.isStarred;
      this.msgStats.starred += res.isStarred ? 1 : -1;
      this.applyMsgFilter();
    });
  }

  deleteMessage(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Delete this message?')) return;
    this.messageService.deleteMessage(id).subscribe(() => {
      const msg = this.messages.find(m => m._id === id);
      if (msg && !msg.isRead) this.msgStats.unread = Math.max(0, this.msgStats.unread - 1);
      this.messages       = this.messages.filter(m => m._id !== id);
      this.msgStats.total = Math.max(0, this.msgStats.total - 1);
      this.applyMsgFilter();
      if (this.selectedMessage?._id === id) this.closeMessage();
    });
  }

  deleteReadMessages(): void {
    if (!confirm('Delete all read messages? This cannot be undone.')) return;
    this.messageService.deleteReadMessages().subscribe(res => {
      this.successMsg = res.message;
      this.loadMessages(); this.loadMsgStats(); this.closeMessage();
      setTimeout(() => this.successMsg = '', 3000);
    });
  }

  openReplyModal(): void {
    if (!this.selectedMessage) return;
    this.replySubject  = `Re: Your message to ThinkFlow`;
    this.replyBody     = '';
    this.replyError    = '';
    this.replySuccess  = '';
    this.showReplyModal = true;
  }

  closeReplyModal(): void {
    this.showReplyModal = false;
    this.replyBody      = '';
    this.replyError     = '';
    this.replySuccess   = '';
  }

  sendReply(): void {
    if (!this.replyBody.trim()) { this.replyError = 'Please write a reply message.'; return; }
    if (!this.selectedMessage)  return;
    this.replySending = true; this.replyError = '';
    this.messageService.sendReply(this.selectedMessage._id, this.replySubject, this.replyBody).subscribe({
      next: (res) => {
        this.replySending            = false;
        this.replySuccess            = res.message;
        this.selectedMessage!.isRead = true;
        setTimeout(() => {
          this.closeReplyModal();
          this.successMsg = `✓ ${res.message}`;
          setTimeout(() => this.successMsg = '', 4000);
        }, 2000);
      },
      error: (err) => {
        this.replySending = false;
        this.replyError   = err.error?.message || 'Failed to send email.';
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  // ── Category CRUD (with Edit support) ─────────────────────
  // ══════════════════════════════════════════════════════════

  submitCategory(): void {
    if (this.categoryForm.invalid) return;
    this.postService.createCategory(this.categoryForm.value).subscribe({
      next: () => {
        this.successMsg = 'Category created!';
        this.categoryForm.reset({ icon: '📝', color: '#D4A853' });
        this.loadCategories();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to create category.'; }
    });
  }

  /** Open inline edit form for a specific category */
  startEditCategory(cat: Category): void {
    // Close any other open edits first
    if (this.editingCategory && this.editingCategory._id === cat._id) {
      this.cancelEditCategory();
      return;
    }
    this.editingCategory = cat;
    this.editCategoryForm.patchValue({
      name:        cat.name,
      description: cat.description || '',
      icon:        cat.icon  || '📝',
      color:       cat.color || '#D4A853'
    });
    this.clearMessages();
  }

  /** Cancel edit without saving */
  cancelEditCategory(): void {
    this.editingCategory = null;
    this.editCategoryForm.reset({ icon: '📝', color: '#D4A853' });
  }

  /** Save the edited category via PUT */
  submitEditCategory(): void {
    if (!this.editingCategory || this.editCategoryForm.invalid) return;
    this.savingCategory = true;
    this.clearMessages();
    this.postService.updateCategory(this.editingCategory._id, this.editCategoryForm.value).subscribe({
      next: (res) => {
        this.savingCategory  = false;
        this.successMsg      = res.message;
        this.editingCategory = null;
        this.loadCategories();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.savingCategory = false;
        this.errorMsg       = err.error?.message || 'Failed to update category.';
      }
    });
  }

  deleteCategory(id: string): void {
    if (!confirm('Delete this category? Posts in this category will become uncategorised.')) return;
    this.postService.deleteCategory(id).subscribe({
      next: () => {
        if (this.editingCategory?._id === id) this.cancelEditCategory();
        this.loadCategories();
        this.successMsg = 'Category deleted.';
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => { this.errorMsg = err.error?.message || 'Delete failed.'; }
    });
  }

  // ── Tab ────────────────────────────────────────────────────
  switchTab(tab: AdminTab): void {
    if (!this.auth.isAdmin && ['categories', 'users', 'messages', 'social'].includes(tab)) return;
    this.activeTab = tab;
    this.clearMessages();
    this.closeMessage();
    this.cancelEditCategory();   // always close any open category edit on tab switch

    if (tab === 'create') {
      this.editingPost = null; this.selectedFile = null; this.previewUrl = ''; this.removeCoverImage = false;
      this.postForm.reset({ status: 'draft' });
      if (this.categories.length === 0) this.loadCategories();
    }
    if (tab === 'overview')                               this.loadOverview();
    if (tab === 'users'    && this.users.length    === 0) this.loadUsers();
    if (tab === 'messages')                               { this.loadMessages(); this.msgFilter = 'all'; }
    if (tab === 'social' && this.auth.isAdmin)             this.loadSocialLinks();
    if (tab === 'comments') { this.loadComments(); this.commentSearch = ''; this.commentFilter = 'all'; }
    if (tab === 'overview' && this.auth.isAdmin && !this.overviewStats) this.loadOverview();
    if (tab === 'overview' && this.auth.isAuthor) this.loadAuthorInsights();
  }

  // ── Post CRUD ──────────────────────────────────────────────
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile     = file;
      this.removeCoverImage = false;
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile     = null;
    this.previewUrl       = '';
    this.removeCoverImage = true;
    const input = document.getElementById('coverImageInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  submitPost(): void {
    if (this.postForm.invalid) { this.postForm.markAllAsTouched(); return; }
    this.saving = true; this.clearMessages();
    const { title, content, excerpt, category, tags, status } = this.postForm.value;
    const fd = new FormData();
    fd.append('title', title);   fd.append('content', content);
    fd.append('excerpt', excerpt || '');  fd.append('category', category || '');
    fd.append('tags', JSON.stringify(tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []));
    fd.append('status', status);
    if (this.selectedFile)     fd.append('coverImage', this.selectedFile);
    if (this.removeCoverImage) fd.append('removeCoverImage', 'true');
    const req = this.editingPost
      ? this.postService.updatePost(this.editingPost._id, fd)
      : this.postService.createPost(fd);
    req.subscribe({
      next: (res) => { this.successMsg = res.message; this.saving = false; this.loadPosts(); this.switchTab('posts'); setTimeout(() => this.successMsg = '', 4000); },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to save post.'; this.saving = false; }
    });
  }

  editPost(post: Post): void {
    this.editingPost = post;
    this.postForm.patchValue({
      title: post.title, content: post.content, excerpt: post.excerpt,
      category: post.category?._id || '', tags: post.tags?.join(', ') || '', status: post.status
    });
    this.previewUrl = post.coverImage
      ? (post.coverImage.startsWith('http') ? post.coverImage : `http://localhost:5000${post.coverImage}`)
      : '';
    this.activeTab = 'create';
    if (this.categories.length === 0) this.loadCategories();
  }

  deletePost(id: string): void {
    if (!confirm('Delete this post?')) return;
    this.postService.deletePost(id).subscribe({
      next:  () => { this.loadPosts(); this.successMsg = 'Post deleted.'; setTimeout(() => this.successMsg = '', 3000); },
      error: (err) => { this.errorMsg = err.error?.message || 'Delete failed.'; }
    });
  }

  // ── Users ──────────────────────────────────────────────────
  startEditRole(user: User): void  { this.editingUserId = user._id; this.editingUserRole = user.role; }
  cancelEditRole(): void            { this.editingUserId = null; this.editingUserRole = 'user'; }

  saveUserRole(userId: string): void {
    this.auth.updateUserRole(userId, this.editingUserRole).subscribe({
      next:  (res) => { this.successMsg = res.message; this.editingUserId = null; this.loadUsers(); setTimeout(() => this.successMsg = '', 3000); },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to update role.'; }
    });
  }
  openPostInNewTab(slug: string): void {
  window.open('/blog/' + slug, '_blank');
}
  toggleUserStatus(userId: string): void {
    this.auth.toggleUserStatus(userId).subscribe({
      next:  (res) => { this.successMsg = res.message; this.loadUsers(); setTimeout(() => this.successMsg = '', 3000); },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to update status.'; }
    });
  }

  deleteUser(userId: string, username: string): void {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    this.auth.deleteUser(userId).subscribe({
      next:  (res) => { this.successMsg = res.message; this.loadUsers(); setTimeout(() => this.successMsg = '', 3000); },
      error: (err) => { this.errorMsg = err.error?.message || 'Failed to delete user.'; }
    });
  }

  goToPost(post: any): void { this.router.navigate(['/blog', post.slug]); }

  // ── Helpers ────────────────────────────────────────────────
  clearMessages(): void { this.errorMsg = ''; this.successMsg = ''; }

  formatNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  hasError(field: string): boolean {
    const c = this.postForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  getRoleIcon(role: string):       string { return ({ admin: '👑', author: '✍', user: '👤' } as any)[role]             || '👤'; }
  getRoleBadgeClass(role: string): string { return ({ admin: 'rb-admin', author: 'rb-author', user: 'rb-user' } as any)[role] || 'rb-user'; }

  getTopicColor(topic: string): string {
    const map: { [k: string]: string } = {
      'General Inquiry': '#3B8BD4', 'Write for Us': '#27AE60',
      'Advertise with Us': '#E67E22', 'Technical Issue': '#e74c3c',
      'Content Removal': '#9B59B6', 'Partnership': '#1ABC9C', 'Other': '#6B6055',
    };
    return map[topic] || '#6B6055';
  }
}






