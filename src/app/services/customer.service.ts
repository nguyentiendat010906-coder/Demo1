import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer } from '../models/customer';


@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = 'https://localhost:44385/api/customers'; // Thay đổi theo API thực tế của bạn

  constructor(private http: HttpClient) {}

  // Lấy tất cả khách hàng
  getAllCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  // Lấy khách hàng theo ID
  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  // Tạo mới khách hàng
  createCustomer(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // Cập nhật khách hàng
  updateCustomer(id: number, customer: Customer): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/${id}`, customer, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // Xóa khách hàng
  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Tìm kiếm khách hàng
  searchCustomers(params: any): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/search`, { params });
  }

  // Lọc theo năm và nhóm
  filterCustomers(year?: string, group?: string): Observable<Customer[]> {
    let url = this.apiUrl;
    const queryParams = [];
    
    if (year) queryParams.push(`year=${year}`);
    if (group && group !== 'Tất cả') queryParams.push(`group=${group}`);
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    
    return this.http.get<Customer[]>(url);
  }
}