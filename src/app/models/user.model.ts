export interface User {
  id: number;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: 'User' | 'Admin';
  interests: string[];
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}
