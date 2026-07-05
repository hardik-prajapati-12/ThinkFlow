// src/app/components/reset-password/reset-password.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type Step = 'email' | 'otp' | 'newpass' | 'done';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  step: Step = 'email';
  loading     = false;
  errorMsg    = '';

  // Stored across steps
  resetEmail     = '';
  approvalToken  = '';

  // Forms
  emailForm!:   FormGroup;
  otpForm!:     FormGroup;
  passForm!:    FormGroup;

  // OTP input
  otpDigits = ['', '', '', '', '', ''];

  // Show/hide password
  showNew     = false;
  showConfirm = false;

  private api = 'http://localhost:5000/api/auth';

  constructor(
    private fb:     FormBuilder,
    private router: Router,
    private http:   HttpClient
  ) {}

  ngOnInit(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]]
    });

    this.passForm = this.fb.group({
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  passwordsMatch(g: FormGroup) {
    const p = g.get('password')?.value;
    const c = g.get('confirmPassword')?.value;
    return p && c && p !== c ? { mismatch: true } : null;
  }

  // ── Step 1: Send OTP ─────────────────────────────────────────
  sendOtp(): void {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    this.http.post<{ message: string }>(`${this.api}/forgot-password`, this.emailForm.value).subscribe({
      next: () => {
        this.loading    = false;
        this.resetEmail = this.emailForm.value.email;
        this.step       = 'otp';
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Could not send OTP. Please try again.';
        this.loading  = false;
      }
    });
  }

  // ── Step 2: Verify OTP ───────────────────────────────────────
  verifyOtp(): void {
    if (this.otpForm.invalid) { this.otpForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    const payload = { email: this.resetEmail, otp: this.otpForm.value.otp };
    this.http.post<{ message: string; approvalToken: string }>(`${this.api}/verify-otp`, payload).subscribe({
      next: (res) => {
        this.loading       = false;
        this.approvalToken = res.approvalToken;
        this.step          = 'newpass';
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Invalid OTP. Please try again.';
        this.loading  = false;
      }
    });
  }

  // ── Step 3: Reset password ───────────────────────────────────
  resetPassword(): void {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    const payload = {
      email:         this.resetEmail,
      approvalToken: this.approvalToken,
      password:      this.passForm.value.password
    };

    this.http.post<{ message: string }>(`${this.api}/reset-password`, payload).subscribe({
      next: () => { this.loading = false; this.step = 'done'; },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Reset failed. Please start over.';
        this.loading  = false;
        if (err.error?.code === 'TOKEN_INVALID') this.step = 'email';
      }
    });
  }

  resendOtp(): void {
    this.step = 'email';
    this.errorMsg = '';
    this.otpForm.reset();
  }

  goToLogin(): void { this.router.navigate(['/login']); }

  hasError(form: FormGroup, field: string): boolean {
    const c = form.get(field);
    return !!(c && c.invalid && c.touched);
  }
}