export type UserRole =
  | 'SUPER_ADMIN'
  | 'MEDICAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'DISPATCHER'
  | 'VOLUNTEER';

export interface AuthUser {
  id: string;
  email: string;
  staffCode: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
