export type UserRole = "ADMIN" | "USER" | "CREATOR" | "CUSTOMER";

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  phoneNumber: string;
  role: UserRole;
  birthDate: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  role: UserRole;
  birthDate?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  // choose one (cookie-based sessions are preferred):
  accessToken?: string;
  refreshToken?: string;
  token?: string; // for compatibility with existing interceptor
}

export type FieldErrorMap = Partial<Record<keyof RegisterInput, string>>;