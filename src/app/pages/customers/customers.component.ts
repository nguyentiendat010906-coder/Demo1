import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];
  selectedCustomer: any = null;

  constructor(private customerService: CustomerService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.customerService.getAllCustomers().subscribe({
      next: data => this.customers = data
    });
  }

  viewDetail(customer: any) {
    this.selectedCustomer = { ...customer }; // Clone để edit
  }

  closeModal() {
    this.selectedCustomer = null;
  }

  saveCustomer() {
    if (!this.selectedCustomer.name?.trim()) {
      alert('Vui lòng nhập họ tên!');
      return;
    }
    if (!this.selectedCustomer.phone?.trim()) {
      alert('Vui lòng nhập số điện thoại!');
      return;
    }

    this.customerService.updateCustomer(this.selectedCustomer.id, this.selectedCustomer).subscribe({
      next: () => {
        alert('Đã cập nhật!');
        this.closeModal();
        this.loadCustomers();
      },
      error: () => alert('Có lỗi xảy ra!')
    });
  }

  deleteCustomer() {
    if (!confirm('Xóa khách hàng này?')) return;
    
    this.customerService.deleteCustomer(this.selectedCustomer.id).subscribe({
      next: () => {
        alert('Đã xóa!');
        this.closeModal();
        this.loadCustomers();
      },
      error: () => alert('Có lỗi xảy ra!')
    });
  }
}