import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../../shared/services/login.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoginDto } from '../../../api/models';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly loginService = inject(LoginService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly isSubmitting = signal(false);
  readonly hasLoginError = signal(false);
  private errorTimeoutId?: number;

  onSubmit() {
    // Clear any existing error timeout
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }

    // Reset error state to allow shake animation to retrigger
    this.hasLoginError.set(false);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const loginData: LoginDto = {
      email: this.loginForm.controls.email.value,
      password: this.loginForm.controls.password.value,
    };

    this.loginService.loginUser(loginData).subscribe({
      next: () => {
        this.toastService.showSuccess('Inloggning lyckades!', { title: 'Välkommen!' });

        // Short delay for visual feedback before nav
        setTimeout(() => {
            this.router.navigate(['/']);
            this.isSubmitting.set(false);
        }, 1000);
      },
      error: (err) => {
        console.error('Login error:', err);

        // Force re-trigger of shake animation by toggling error state
        // This ensures the animation plays even if user clicks multiple times
        setTimeout(() => {
          this.hasLoginError.set(true);

          // Auto-clear error state after 2 seconds
          this.errorTimeoutId = window.setTimeout(() => {
            this.hasLoginError.set(false);
            this.errorTimeoutId = undefined;
          }, 2000);
        }, 0);

        this.toastService.showError('Fel e-post eller lösenord');
        this.isSubmitting.set(false);
      },
    });
  }
}
