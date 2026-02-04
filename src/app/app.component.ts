import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationComponent } from './shared/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationComponent],
  template: `<app-table-invoice></app-table-invoice>`,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(public router: Router) {}

  showLang = false;
  sidebarOpen = false;
  showUserMenu = false;
  
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  toggleLang() {
    this.showLang = !this.showLang;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    // Xóa token hoặc thông tin đăng nhập
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Chuyển hướng về trang login
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar-circle') && !target.closest('.user-menu')) {
      this.showUserMenu = false;
    }
  }
}