import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TableStatus = 'empty' | 'serving' | 'reserved';

export interface ApiTable {
  id: number;
  name: string;
  status: TableStatus;
  tableGroupId: number;
  tableGroupName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {

  private apiUrl = 'https://localhost:44385/api/tables';

  constructor(private http: HttpClient) {}

  // ===============================
  // GET: lấy danh sách bàn
  // ===============================
  getTables(groupId?: number): Observable<ApiTable[]> {
    const url = groupId
      ? `${this.apiUrl}?groupId=${groupId}`
      : this.apiUrl;

    return this.http.get<ApiTable[]>(url);
  }

  // ===============================
  // PUT: cập nhật trạng thái bàn
  // ⚠ body là STRING, không phải object
  // ===============================
  updateStatus(id: number, status: TableStatus) {
    return this.http.put(
      `${this.apiUrl}/${id}/status`,
      `"${status}"`, // gửi string JSON
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    );
  }

  // ===============================
  // POST: thêm bàn mới
  // ===============================
  addTable(groupId: number, name: string): Observable<ApiTable> {
    return this.http.post<ApiTable>(this.apiUrl, {
      name,
      tableGroupId: groupId
    });
  }

  // ===============================
  // 👉 POST: MỞ BÀN (TẠO INVOICE)
  // ===============================
  openTable(tableId: number) {
    return this.http.post<any>(
      `${this.apiUrl}/${tableId}/open`,
      {}
    );
  }
// Thêm vào TableService
getTableById(tableId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/${tableId}`);
}
  // ===============================
  // 👉 GET: invoice đang mở theo bàn
  // ===============================
  getOpenInvoiceByTable(tableId: number) {
    return this.http.get<any>(
      `https://localhost:44385/api/invoices/by-table/${tableId}`
    );
  }
}
