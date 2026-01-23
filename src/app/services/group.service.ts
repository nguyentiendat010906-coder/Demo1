// services/group.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // ← Thêm HttpParams
import { Observable } from 'rxjs';
import { Group } from '../models/group';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = 'https://localhost:44385/api/groups';

  constructor(private http: HttpClient) {}

  // ✅ CHỈ GIỮ LẠI method này (có parameter type)
  getAllGroups(type?: string): Observable<Group[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<Group[]>(this.apiUrl, { params });
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(group: any): Observable<any> {
    return this.http.post(this.apiUrl, group);
  }

  updateGroup(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}