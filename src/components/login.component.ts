import { Component, ChangeDetectionStrategy, output, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  login = output<{ username: string, password: string }>();
  error = input<string | null>(null);

  private fb: FormBuilder = inject(FormBuilder);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.login.emit(this.loginForm.getRawValue() as { username: string, password: string });
    }
  }
}
