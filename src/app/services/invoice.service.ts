import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  private apiUrl = 'http://localhost:5054/api/invoices';

  constructor(private http: HttpClient) {}

  // ✅ LẤY TẤT CẢ HÓA ĐƠN
  getAllInvoices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // ✅ LẤY CHI TIẾT 1 HÓA ĐƠN
  getInvoiceById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
