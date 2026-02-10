import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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

  // Expose signals for template if needed (though formControlName handles most)
  // We can use toSignal for derived state if we want real-time validation feedback outside the inputs

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isSubmitting.set(true);
    
    const loginData: LoginDto = {
      email: this.loginForm.controls.email.value,
      password: this.loginForm.controls.password.value,
    };

    this.loginService.loginUser(loginData).subscribe({
      next: (response) => {
        // Assuming response might contain token or user info
        this.toastService.showSuccess('Inloggning lyckades!', { title: 'Välkommen!' });
        
        // TODO: Handle token storage here if needed (e.g. AuthService)
        
        setTimeout(() => {
            this.router.navigate(['/']); // Or dashboard
            this.isSubmitting.set(false);
        }, 1000); 
      },
      error: (err) => {
        console.error('Login error:', err);
        this.toastService.showError('Fel e-post eller lösenord');
        this.isSubmitting.set(false);
      },
    });
  }
}