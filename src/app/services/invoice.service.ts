import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:5054/api/invoices';

  constructor(private http: HttpClient) {}

  // ===== LẤY DANH SÁCH TẤT CẢ HÓA ĐƠN ===== ✅ THÊM METHOD NÀY
  getAllInvoices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Lấy chi tiết hóa đơn theo ID
  getInvoiceById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Lấy hóa đơn đang mở theo bàn
  getInvoiceByTable(tableId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-table/${tableId}`);
  }

  // Tạo hóa đơn mới cho bàn
  createInvoiceForTable(tableId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-for-table/${tableId}`, {});
  }

  // Lấy danh sách món trong hóa đơn
  getInvoiceItems(invoiceId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${invoiceId}/items`);
  }

  // Thêm món vào hóa đơn
  addInvoiceItem(invoiceId: number, item: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${invoiceId}/items`, item);
  }

  // Cập nhật món
  updateInvoiceItem(invoiceId: number, itemId: number, item: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${invoiceId}/items/${itemId}`, item);
  }

  // Xóa món
  deleteInvoiceItem(invoiceId: number, itemId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${invoiceId}/items/${itemId}`);
  }

  // Thanh toán (checkout)
 checkout(invoiceId: number, endTime: Date) {
  return this.http.put(`${this.apiUrl}/${invoiceId}/checkout`, {
    endTime: endTime.toISOString()
  });
}
}