import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  username = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register() {
    this.error = '';
    this.success = '';

    if (!this.username || !this.password || !this.confirmPassword) {
      this.error = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Mật khẩu không khớp';
      return;
    }

    // ✅ GỌI API
    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.success = 'Đăng ký thành công';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Đăng ký thất bại';
      }
    });
  }

  goLogin() {
    this.router.navigate(['/login']);
  }
}
