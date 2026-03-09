import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card animate-fade-in">
        <div class="auth-header">
          <div class="logo-placeholder">E</div>
          <h1>ELLA Booking</h1>
          <p>{{ isActivation ? 'Activate your account to get started' : 'Enter your email to reset your password' }}</p>
        </div>

        <div *ngIf="success" class="alert success animate-slide-up">
          <div class="alert-icon">✔</div>
          <div class="alert-content">
            <strong>Check your inbox!</strong>
            <p>If an account exists for {{ email }}, you will receive an email shortly.</p>
          </div>
        </div>

        <form *ngIf="!success" #forgotForm="ngForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <span class="input-icon">✉</span>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                placeholder="name@example.com"
                [disabled]="loading"
              />
            </div>
          </div>

          <div *ngIf="error" class="alert error animate-shake">
            <div class="alert-icon">⚠</div>
            <p>{{ error }}</p>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="forgotForm.invalid || loading">
            <span *ngIf="!loading">{{ isActivation ? 'Send Activation Link' : 'Send Reset Link' }}</span>
            <span *ngIf="loading" class="spinner"></span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Remember your password? <a routerLink="/login">Back to Login</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss']
})
export class ForgotPasswordPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  
  email = '';
  loading = false;
  success = false;
  error = '';
  isActivation = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.isActivation = params['mode'] === 'activate';
    });
  }

  onSubmit() {
    this.loading = true;
    this.error = '';

    const endpoint = this.isActivation ? '/api/auth/activate-account' : '/api/auth/forgot-password';

    this.http.post(endpoint, { email: this.email })
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Something went wrong. Please try again later.';
          this.loading = false;
        }
      });
  }
}