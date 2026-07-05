// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  private readonly passwordPattern =
    /^[A-Z](?=.*[^A-Za-z0-9])[A-Za-z0-9!@#$%^&*()_\-+=\[\]{}|;:'",.<>/?`~]{5,}$/;

  loginForm:    FormGroup;
  registerForm: FormGroup;
  activeTab:    'login' | 'register' = 'login';
  loading       = false;
  errorMsg      = '';
  successMsg    = '';
  showPassword  = false;
  sessionMsg    = '';

  constructor(
    private fb:    FormBuilder,
    private auth:  AuthService,
    private router: Router,
    private route:  ActivatedRoute
  ) {
    if (this.auth.isLoggedIn) this.router.navigate(['/']);

    // Always start with empty fields — never pre-fill
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email:    ['', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern(this.passwordPattern)]]
    });
  }

  ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    if (params['reason'] === 'session_expired') {
      this.sessionMsg = '⚠ Your session expired. Please sign in again.';
    }
    // Reactively switch tab whenever query param changes
    this.activeTab = params['tab'] === 'register' ? 'register' : 'login';
    // Clear messages on tab switch
    this.errorMsg   = '';
    this.successMsg = '';
  });
}

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab  = tab;
    this.errorMsg   = '';
    this.successMsg = '';
    // Clear both forms when switching tabs
    this.loginForm.reset();
    this.registerForm.reset();
  }

  onLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';
    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate([this.auth.isAdmin || this.auth.isAuthor ? '/admin' : '/']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Login failed. Check your credentials.';
        this.loading  = false;
      }
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    this.auth.register(this.registerForm.value).subscribe({
      next: () => {
        this.loading    = false;
        this.successMsg = 'Account created! Redirecting...';
        setTimeout(() => this.router.navigate(['/']), 1500);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Registration failed.';
        this.loading  = false;
      }
    });
  }

  hasError(form: FormGroup, field: string): boolean {
    const c = form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  hasFieldError(form: FormGroup, field: string, error: string): boolean {
    const c = form.get(field);
    return !!(c && c.touched && c.hasError(error));
  }
}
