import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiTable } from './table.service';

export interface TableGroup {
  id: number;
  name: string;
  tables: ApiTable[];
}

@Injectable({ providedIn: 'root' })
export class TableGroupService {
  private apiUrl = 'http://localhost:5054/api/TableGroups';

  constructor(private http: HttpClient) {}

  getGroups(): Observable<TableGroup[]> {
    return this.http.get<TableGroup[]>(this.apiUrl);
  }

  addGroup(name: string) {
    return this.http.post<TableGroup>(this.apiUrl, { name });
  }

  addTable(groupId: number, name: string, capacity = 4) {
    return this.http.post<ApiTable>(
      `${this.apiUrl}/${groupId}/tables`,
      { name, capacity }
    );
  }
}
