import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User, AuthResponse } from '../models/user.model';
import { API_CONFIG } from '../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = API_CONFIG.TOURISM_API.baseUrl || 'https://localhost:5001/api';
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromLocalStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getUserFromLocalStorage(): User | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  register(email: string, password: string, firstName: string, lastName: string): Observable<AuthResponse> {
    const dbUrl = API_CONFIG.FIREBASE.databaseURL?.replace(/\/$/, '') || null;
    if (!dbUrl) {
      return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
        email,
        password,
        firstName,
        lastName
      });
    }

    const id = Date.now();
    const user = {
      id,
      email,
      password,
      firstName,
      lastName,
      role: 'User' as const,
      interests: [] as string[],
      createdAt: new Date().toISOString()
    };

    // Write user under /users/{id}.json so we have a stable numeric id
    return this.http.put<any>(`${dbUrl}/users/${id}.json`, user).pipe(
      map(() => {
        const userObj: User = {
          id: user.id,
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          interests: user.interests,
          createdAt: new Date(user.createdAt)
        } as any;
        return { token: String(id), user: userObj } as AuthResponse;
      }),
      catchError((err) => throwError(() => err))
    ) as unknown as Observable<AuthResponse>;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const dbUrl = API_CONFIG.FIREBASE.databaseURL?.replace(/\/$/, '') || null;
    if (!dbUrl) {
      return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
        email,
        password
      });
    }

    // Query Firebase Realtime DB for a user with matching email
    const orderBy = encodeURIComponent('"email"');
    const equalTo = encodeURIComponent('"' + email + '"');
    const url = `${dbUrl}/users.json?orderBy=${orderBy}&equalTo=${equalTo}`;

    return this.http.get<Record<string, any>>(url).pipe(
      map((resp) => {
        if (!resp) throw new Error('User not found');
        const keys = Object.keys(resp || {});
        if (!keys.length) throw new Error('User not found');
        const first = resp[keys[0]];
        if (!first || first.password !== password) throw new Error('Invalid credentials');
        const userObj: User = {
          id: first.id,
          email: first.email,
          firstName: first.firstName,
          lastName: first.lastName,
          role: first.role || 'User',
          interests: first.interests || [],
          createdAt: new Date(first.createdAt)
        } as any;
        return { token: String(userObj.id), user: userObj } as AuthResponse;
      }),
      catchError((err) => throwError(() => err))
    ) as unknown as Observable<AuthResponse>;
  }

  setCurrentUser(user: User, token: string): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }
}
