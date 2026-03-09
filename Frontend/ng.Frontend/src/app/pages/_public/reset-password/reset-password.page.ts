import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card animate-fade-in">
        <div class="auth-header">
          <div class="logo-placeholder">E</div>
          <h1>ELLA Booking</h1>
          <p>Set your new password below</p>
        </div>

        <div *ngIf="success" class="alert success animate-slide-up">
          <div class="alert-icon">✔</div>
          <div class="alert-content">
            <strong>Success!</strong>
            <p>Your password has been updated. You can now log in.</p>
            <a routerLink="/login" class="btn btn-primary mt-2">Go to Login</a>
          </div>
        </div>

        <form *ngIf="!success" #resetForm="ngForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="password">New Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="newPassword"
                required
                minlength="6"
                placeholder="Minimum 6 characters"
                [disabled]="loading"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                [(ngModel)]="confirmPassword"
                required
                placeholder="Repeat your password"
                [disabled]="loading"
              />
            </div>
            <p *ngIf="newPassword !== confirmPassword && confirmPassword" class="field-error">Passwords do not match</p>
          </div>

          <div *ngIf="error" class="alert error animate-shake">
            <div class="alert-icon">⚠</div>
            <p>{{ error }}</p>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="resetForm.invalid || loading || newPassword !== confirmPassword">
            <span *ngIf="!loading">Update Password</span>
            <span *ngIf="loading" class="spinner"></span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Changed your mind? <a routerLink="/login">Back to Login</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss'],
  styles: [`
    .mt-2 { margin-top: 1rem; }
    .field-error { color: #f87171; font-size: 0.8rem; margin-top: 0.25rem; }
  `]
})
export class ResetPasswordPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  success = false;
  error = '';

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.email || !this.token) {
      this.error = 'Invalid reset link. Please request a new one.';
    }
  }

  onSubmit() {
    this.loading = true;
    this.error = '';

    const payload = {
      email: this.email,
      token: this.token,
      newPassword: this.newPassword
    };

    this.http.post('/api/auth/reset-password', payload)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to reset password. The link may have expired.';
          this.loading = false;
        }
      });
  }
}