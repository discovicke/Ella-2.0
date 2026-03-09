import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
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
          <p>{{ isActivation() ? 'Aktivera ditt konto för att komma igång' : 'Ange din e-post för att återställa lösenordet' }}</p>
        </div>

        @if (success()) {
          <div class="alert success animate-slide-up">
            <div class="alert-icon">✔</div>
            <div class="alert-content">
              <strong>Kolla din inkorg!</strong>
              <p>Om ett konto finns för {{ email() }}, kommer du få ett mail inom kort.</p>
            </div>
          </div>
        }

        @if (!success()) {
          <form #forgotForm="ngForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">E-postadress</label>
              <div class="input-wrapper">
                <span class="input-icon">✉</span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  email
                  placeholder="namn@exempel.se"
                  [disabled]="loading()"
                />
              </div>
            </div>

            @if (error()) {
              <div class="alert error animate-shake">
                <div class="alert-icon">⚠</div>
                <p>{{ error() }}</p>
              </div>
            }

            <button type="submit" class="btn btn-primary btn-block" [disabled]="forgotForm.invalid || loading()">
              @if (!loading()) {
                <span>{{ isActivation() ? 'Skicka aktiveringslänk' : 'Skicka återställningslänk' }}</span>
              } @else {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }

        <div class="auth-footer">
          <p>Kommer du ihåg lösenordet? <a routerLink="/login">Tillbaka till logga in</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  
  email = signal('');
  loading = signal(false);
  success = signal(false);
  error = signal('');
  isActivation = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.isActivation.set(params['mode'] === 'activate');
    });
  }

  onSubmit() {
    this.loading.set(true);
    this.error.set('');

    const endpoint = this.isActivation() ? '/api/auth/activate-account' : '/api/auth/forgot-password';

    this.http.post(endpoint, { email: this.email() })
      .subscribe({
        next: () => {
          this.success.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Något gick fel. Försök igen senare.');
          this.loading.set(false);
        }
      });
  }
}