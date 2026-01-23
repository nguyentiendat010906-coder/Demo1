import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'https://localhost:44385/api/auth';

  constructor(private http: HttpClient) {}

  // ✅ LOGIN
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, {
      username,
      password
    });
  }

  // ✅ REGISTER (BẮT BUỘC)
  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, {
      username,
      password
    });
  }
}
