import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
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
          <p>Ange ditt nya lösenord nedan</p>
        </div>

        @if (success()) {
          <div class="alert success animate-slide-up">
            <div class="alert-icon">✔</div>
            <div class="alert-content">
              <strong>Klart!</strong>
              <p>Ditt lösenord har uppdaterats. Du kan nu logga in.</p>
              <a routerLink="/login" class="btn btn-primary mt-2">Gå till logga in</a>
            </div>
          </div>
        }

        @if (!success()) {
          <form #resetForm="ngForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="password">Nytt lösenord</label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  [(ngModel)]="newPassword"
                  required
                  minlength="6"
                  placeholder="Minst 6 tecken"
                  [disabled]="loading()"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Bekräfta lösenord</label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  placeholder="Upprepa lösenordet"
                  [disabled]="loading()"
                />
              </div>
              @if (newPassword !== confirmPassword && confirmPassword) {
                <p class="field-error">Lösenorden matchar inte</p>
              }
            </div>

            @if (error()) {
              <div class="alert error animate-shake">
                <div class="alert-icon">⚠</div>
                <p>{{ error() }}</p>
              </div>
            }

            <button type="submit" class="btn btn-primary btn-block" [disabled]="resetForm.invalid || loading() || newPassword !== confirmPassword">
              @if (!loading()) {
                <span>Uppdatera lösenord</span>
              } @else {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }

        <div class="auth-footer">
          <p>Ångrat dig? <a routerLink="/login">Tillbaka till logga in</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss'],
  styles: [`
    .mt-2 { margin-top: 1rem; }
    .field-error { color: #f87171; font-size: 0.8rem; margin-top: 0.25rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  
  loading = signal(false);
  success = signal(false);
  error = signal('');

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.email || !this.token) {
      this.error.set('Ogiltig länk. Vänligen be om en ny.');
    }
  }

  onSubmit() {
    this.loading.set(true);
    this.error.set('');

    const payload = {
      email: this.email,
      token: this.token,
      newPassword: this.newPassword
    };

    this.http.post('/api/auth/reset-password', payload)
      .subscribe({
        next: () => {
          this.success.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Misslyckades att återställa lösenordet. Länken kan ha gått ut.');
          this.loading.set(false);
        }
      });
  }
}