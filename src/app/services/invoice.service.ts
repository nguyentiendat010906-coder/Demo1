import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// ✅ Interface cho customer info
export interface UpdateCustomerInfoDto {
  customerName?: string;
  customerPhone?: string;
  customerTaxCode?: string;
  customerIdCard?: string;
  customerEmail?: string;
  customerAddress?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'https://localhost:44385/api/invoices';

  constructor(private http: HttpClient) {}

  // ===== LẤY DANH SÁCH TẤT CẢ HÓA ĐƠN =====
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

  // ✅ TẠO HÓA ĐƠN MANG VỀ (không có bàn)
  createTakeawayInvoice(): Observable<any> {
    const invoiceData = {
      tableId: null, // Mang về không cần bàn
      invoiceDate: new Date().toISOString(),
      status: 'Open'
    };
    return this.http.post(this.apiUrl, invoiceData); // ✅ SỬA: bỏ /invoices
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

  // ✅ XÓA HÓA ĐƠN
  deleteInvoice(invoiceId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${invoiceId}`);
  }

  // ✅ CẬP NHẬT THÔNG TIN KHÁCH HÀNG
  updateInvoiceCustomer(invoiceId: number, customerData: UpdateCustomerInfoDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${invoiceId}/customer`, customerData);
  }

  // Thanh toán (checkout)
  checkout(invoiceId: number, endTime: Date): Observable<any> {
    return this.http.put(`${this.apiUrl}/${invoiceId}/checkout`, {
      endTime: endTime.toISOString()
    });
  }

  // Hoàn tất hóa đơn
  finalizeInvoice(invoiceId: string | number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/finalize`, {});
  }
}