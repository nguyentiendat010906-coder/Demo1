import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TableStatus = 'empty' | 'serving' | 'reserved';

export interface ApiTable {
  id: number;
  name: string;
  capacity: number;
  status: TableStatus;
  tableGroupId: number;
  tableGroupName: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {

  private apiUrl = 'http://localhost:5054/api/Tables';

  constructor(private http: HttpClient) {}

  getTables(): Observable<ApiTable[]> {
    return this.http.get<ApiTable[]>(this.apiUrl);
  }

  updateStatus(id: number, status: TableStatus) {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status });
  }
}
