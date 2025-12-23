import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface TableGroup {
  id: number;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableGroupsComponent {
  private apiUrl = 'http://localhost:5054/table-groups';
  
  private tableGroups = new BehaviorSubject<TableGroup[]>([]);
  tableGroups$ = this.tableGroups.asObservable();

  constructor(private http: HttpClient) {
    this.loadGroups();
  }

  loadGroups() {
    this.http.get<TableGroup[]>(this.apiUrl).subscribe({
      next: groups => this.tableGroups.next(groups),
      error: err => console.error('Load groups error:', err)
    });
  }

  addGroup(name: string, description?: string): Observable<TableGroup> {
    return this.http.post<TableGroup>(this.apiUrl, { name, description })
      .pipe(tap(() => this.loadGroups()));
  }

  updateGroup(id: number, name: string, description?: string): Observable<TableGroup> {
    return this.http.put<TableGroup>(`${this.apiUrl}/${id}`, { name, description })
      .pipe(tap(() => this.loadGroups()));
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => this.loadGroups()));
  }
}