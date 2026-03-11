import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  submitted = false;                    // ✅ تتبع حالة الإرسال
  showValidationSummary = false;        // ✅ إظهار ملخص الأخطاء
  showPassword = false;                 // ✅ toggler لعرض/إخفاء الباسورد

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // ✅ الاستماع لتغيرات الفورم لإخفاء رسائل الخطأ العامة
    this.loginForm.valueChanges.subscribe(() => {
      if (this.errorMessage || this.showValidationSummary) {
        this.errorMessage = '';
        this.showValidationSummary = false;
      }
    });
  }

  // ✅ Getters
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // ✅ Toggle عرض/إخفاء كلمة المرور
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    const input = document.getElementById('password') as HTMLInputElement;
    if (input) {
      input.type = this.showPassword ? 'text' : 'password';
    }
  }

  // ✅ عند تعديل أي حقل - إخفاء رسائل الخطأ العامة
  onFieldChange(): void {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
    if (this.showValidationSummary) {
      this.showValidationSummary = false;
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.showValidationSummary = false;
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ التحقق من صحة الفورم
    if (this.loginForm.invalid) {
      this.showValidationSummary = true;
      this.markFormGroupTouched(this.loginForm);
      this.scrollToTop();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = 'Login successful. Redirecting...';
        this.errorMessage = '';
        this.showValidationSummary = false;

        if (response?.user && response?.token) {
          this.authService.setCurrentUser(response.user, response.token);
        }

        setTimeout(() => this.router.navigate(['/places']), 900);
      },
      error: (err) => {
        this.loading = false;
        this.successMessage = '';

        // 🎯 تحسين رسائل الخطأ للمستخدم
        if (err?.status === 401) {
          this.errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (err?.status === 403) {
          this.errorMessage = 'Your account is not authorized. Please contact support.';
        } else if (err?.status === 423) {
          this.errorMessage = 'This account is locked. Please try again later or contact support.';
        } else if (err?.status === 404) {
          this.errorMessage = 'Account not found. Please register first.';
        } else if (err?.status >= 500) {
          this.errorMessage = 'Server error occurred. Please try again later.';
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Login failed. Please check your connection and try again.';
        }

        this.showValidationSummary = false;
        this.scrollToTop();
      }
    });
  }

  // ✅ تحديد كل الحقول كملموسة لإظهار الأخطاء
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ✅ التمرير السلس لأعلى عند ظهور خطأ
  private scrollToTop(): void {
    setTimeout(() => {
      const alertElement = document.querySelector('.alert');
      if (alertElement) {
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }
}