// src/app/components/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { User, Post } from '../../models';

type ProfileTab = 'info' | 'security' | 'posts' | 'activity';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  activeTab: ProfileTab = 'info';

  // Avatar
  avatarUrl        = '';
  avatarUploading  = false;
  avatarError      = '';

  // Profile form
  profileForm!: FormGroup;
  profileSaving  = false;
  profileSuccess = '';
  profileError   = '';

  // Password form
  passwordForm!: FormGroup;
  passwordSaving  = false;
  passwordSuccess = '';
  passwordError   = '';
  showCurrent     = false;
  showNew         = false;
  showConfirm     = false;

  // Posts
  myPosts:     Post[] = [];
  postsLoading = false;

  constructor(
    private fb:          FormBuilder,
    public auth:         AuthService,
    private postService: PostService,
    public router:       Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.user     = this.auth.currentUser;
    this.avatarUrl = this.buildAvatarUrl(this.user?.avatar);
    this.initForms();
    this.loadMyPosts();
  }

  initForms(): void {
    this.profileForm = this.fb.group({
      username: [this.user?.username || '', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      bio:      [this.user?.bio      || '', [Validators.maxLength(200)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  passwordsMatch(group: FormGroup): { [key: string]: boolean } | null {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  }

  switchTab(tab: ProfileTab): void {
    this.activeTab = tab;
    this.profileSuccess = ''; this.profileError   = '';
    this.passwordSuccess = ''; this.passwordError = '';
    this.avatarError = '';
  }

  // ── Avatar helpers ───────────────────────────────────────────
  buildAvatarUrl(avatar?: string): string {
    if (!avatar) return '';
    if (avatar.startsWith('http')) return avatar;
    return `https://thinkflow-ki0r.onrender.com${avatar}`;
  }

  /** Triggered when user clicks the avatar area and picks a file */
  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file triggers the event again
    input.value = '';

    if (!file.type.startsWith('image/')) {
      this.avatarError = 'Please select an image file (JPG, PNG, WebP).';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError = 'Image must be under 2 MB.';
      return;
    }

    this.avatarUploading = true;
    this.avatarError     = '';
    this.profileSuccess  = '';

    this.auth.uploadAvatar(file).subscribe({
      next: (res) => {
        this.user          = res.user;
        this.avatarUrl     = this.buildAvatarUrl(res.user.avatar);
        this.avatarUploading = false;
        this.profileSuccess  = 'Profile photo updated!';
        setTimeout(() => this.profileSuccess = '', 4000);
      },
      error: (err) => {
        this.avatarError     = err.error?.message || 'Failed to upload photo. Try again.';
        this.avatarUploading = false;
      }
    });
  }

  /** Triggered when user clicks "Remove Photo" */
  onAvatarRemove(): void {
    if (this.avatarUploading) return;
    this.avatarUploading = true;
    this.avatarError     = '';
    this.profileSuccess  = '';

    this.auth.removeAvatar().subscribe({
      next: (res) => {
        this.user          = res.user;
        this.avatarUrl     = '';
        this.avatarUploading = false;
        this.profileSuccess  = 'Profile photo removed.';
        setTimeout(() => this.profileSuccess = '', 4000);
      },
      error: (err) => {
        this.avatarError     = err.error?.message || 'Failed to remove photo.';
        this.avatarUploading = false;
      }
    });
  }

  // ── Save profile ─────────────────────────────────────────────
  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.profileSaving  = true;
    this.profileSuccess = '';
    this.profileError   = '';

    const { username, bio } = this.profileForm.value;
    this.auth.updateProfile({ username: username.trim(), bio: bio.trim() }).subscribe({
      next: (res) => {
        this.user           = res.user;
        this.profileSaving  = false;
        this.profileSuccess = res.message;
        setTimeout(() => this.profileSuccess = '', 4000);
      },
      error: (err) => {
        this.profileError  = err.error?.message || 'Failed to update profile.';
        this.profileSaving = false;
      }
    });
  }

  // ── Change password ──────────────────────────────────────────
  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.passwordSaving  = true;
    this.passwordSuccess = '';
    this.passwordError   = '';

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.passwordSaving  = false;
        this.passwordSuccess = res.message;
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess = '', 5000);
      },
      error: (err) => {
        this.passwordError  = err.error?.message || 'Failed to change password.';
        this.passwordSaving = false;
      }
    });
  }

  // ── My Posts ─────────────────────────────────────────────────
  loadMyPosts(): void {
    if (!this.auth.isAuthorOrAdmin) return;
    this.postsLoading = true;
    this.postService.getMyPosts().subscribe({
      next:  (posts) => { this.myPosts = posts; this.postsLoading = false; },
      error: ()      => { this.postsLoading = false; }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  getInitials(): string {
    return (this.user?.username || 'U').charAt(0).toUpperCase();
  }

  getRoleLabel(): string {
    const map: { [k: string]: string } = { admin: '👑 Admin', author: '✍ Author', user: '👤 User' };
    return map[this.user?.role || 'user'] || '👤 User';
  }

  getRoleClass(): string {
    return 'role-' + (this.user?.role || 'user');
  }

  getMemberSince(): string {
    if (!this.user?.createdAt) return '';
    return new Date(this.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  hasError(form: FormGroup, field: string): boolean {
    const c = form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  goToPost(slug: string): void {
    this.router.navigate(['/blog', slug]);
  }
}