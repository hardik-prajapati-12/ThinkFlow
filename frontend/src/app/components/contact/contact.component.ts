// src/app/components/contact/contact.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService }    from '../../services/auth.service';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  submitted  = false;
  loading    = false;
  errorMsg   = '';

  /** True when user arrived via the "Start Writing" CTA as a non-author */
  showAuthorBanner = false;

  topics = [
    'General Inquiry', 'Write for Us', 'Advertise with Us',
    'Technical Issue', 'Content Removal', 'Partnership', 'Other'
  ];

  faqs = [
    {
      q: 'Can I write for ThinkFlow?',
      a: 'Yes! We welcome contributors. Fill out the contact form with your topic idea and writing samples.'
    },
    {
      q: 'How do I report an issue?',
      a: 'Use the contact form and select "Technical Issue" as the topic. We respond within 24 hours.'
    },
    {
      q: 'Are there advertising opportunities?',
      a: 'Yes, we offer sponsored content and banner ads. Select "Advertise with Us" to learn more.'
    },
    {
      q: 'Can I request a topic?',
      a: 'Absolutely! Select "General Inquiry" and tell us what you\'d like to read about.'
    }
  ];

  openFaqIndex: number | null = null;

  constructor(
    private fb:             FormBuilder,
    private route:          ActivatedRoute,
    private auth:           AuthService,
    private messageService: MessageService
  ) {
    this.contactForm = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      email:   ['', [Validators.required, Validators.email]],
      topic:   ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  ngOnInit(): void {
    // ── Detect "become author" referral ──────────────────────────
    this.route.queryParamMap.subscribe(params => {
      if (params.get('ref') === 'become-author') {
        this.showAuthorBanner = true;
        // Pre-select "Write for Us" topic so the form is ready to go
        this.contactForm.patchValue({ topic: 'Write for Us' });
      }
    });

    // ── Pre-fill name & email when logged in ─────────────────────
    const user = this.auth.currentUser;
    if (user) {
      this.contactForm.patchValue({
        name:  user.username || '',
        email: user.email    || ''
      });
    }
  }

  onSubmit(): void {
    if (this.contactForm.invalid) { this.contactForm.markAllAsTouched(); return; }
    this.loading  = true;
    this.errorMsg = '';

    this.messageService.sendMessage(this.contactForm.value).subscribe({
      next: () => {
        this.submitted = true;
        this.loading   = false;
        this.contactForm.reset();
        const user = this.auth.currentUser;
        if (user) {
          this.contactForm.patchValue({ name: user.username, email: user.email });
        }
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to send message. Please try again.';
        this.loading  = false;
      }
    });
  }

  get isLoggedIn(): boolean { return this.auth.isLoggedIn; }

  toggleFaq(i: number): void {
    this.openFaqIndex = this.openFaqIndex === i ? null : i;
  }

  hasError(field: string): boolean {
    const c = this.contactForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  reset(): void {
    this.submitted = false;
    this.errorMsg  = '';
  }
}