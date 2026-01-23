import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceDetailService {

  private apiUrl = 'https://localhost:44385/api/InvoiceDetails';

  constructor(private http: HttpClient) {}

  addDetail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, data);
  }

  updateQuantity(detailId: number, quantity: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/update?detailId=${detailId}&quantity=${quantity}`,
      {}
    );
  }

  deleteDetail(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getByInvoice(invoiceId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-invoice/${invoiceId}`);
  }
}
