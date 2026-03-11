import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  submitted = false; // ✅ جديد: لتتبع حالة الإرسال
  showValidationSummary = false; // ✅ جديد: لإظهار ملخص الأخطاء

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { 
      // ✅ Validator مخصص لمطابقة كلمات المرور
      validators: this.passwordMatchValidator 
    });
  }

  // ✅ Validator مخصص لمطابقة الباسورد
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword && control.get('confirmPassword')?.hasError('passwordMismatch')) {
      control.get('confirmPassword')?.setErrors(null);
    }
    
    return null;
  }

  // ✅ Getters للوصول للحقول
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  onSubmit(): void {
    this.submitted = true; // ✅ تعليم أن المستخدم حاول الإرسال
    this.showValidationSummary = false;
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ إظهار ملخص الأخطاء إذا الفورم غير صالح
    if (this.registerForm.invalid) {
      this.showValidationSummary = true;
      this.markFormGroupTouched(this.registerForm);
      this.scrollToTop();
      return;
    }

    const { confirmPassword, ...formData } = this.registerForm.value;

    // ✅ التحقق من مطابقة الباسورد (احتياطي)
    if (formData.password !== confirmPassword) {
      this.registerForm.setErrors({ passwordMismatch: true });
      this.errorMessage = 'Passwords do not match';
      this.showValidationSummary = true;
      this.scrollToTop();
      return;
    }

    this.loading = true;

    this.authService.register(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = 'Registration successful. Redirecting...';
        this.errorMessage = '';
        this.showValidationSummary = false;
        
        if (response?.user && response?.token) {
          this.authService.setCurrentUser(response.user, response.token);
        }
        
        setTimeout(() => this.router.navigate(['/places']), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.successMessage = '';
        
        // 🎯 تحسين رسائل الخطأ
        if (err?.status === 409) {
          this.errorMessage = 'User already exists with this email.';
        } else if (err?.status === 423) {
          this.errorMessage = 'This resource is locked. Please try again later or contact support.';
        } else if (err?.status >= 500) {
          this.errorMessage = 'Server error occurred. Please try again later.';
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
        
        this.scrollToTop();
      }
    });
  }

  // ✅ دالة لتحديد كل الحقول كملموسة لإظهار الأخطاء
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ✅ دالة للتمرير لأعلى الصفحة عند ظهور خطأ
  private scrollToTop(): void {
    setTimeout(() => {
      const alertElement = document.querySelector('.alert');
      if (alertElement) {
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}