// src/types/index.ts

// ── Auth ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  role: UserRole;
  username: string;
}

// ── Forms ──────────────────────────────────────────────────────────────────

export interface FormDefinition {
  id?: number;
  title: string;
  description?: string;
  surveyjs_json: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Submissions ────────────────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'reviewed' | 'archived';

export interface Submission {
  id: number;
  form_id: number;
  form_type: string;
  data: Record<string, unknown>;
  status: SubmissionStatus;
  submitted_by_user_id?: number;
  submitted_by_username?: string;
  updated_by_user_id?: number;
  updated_by_username?: string;
  created_at: string;
  updated_at?: string;
}

// ── Toast (UI) ─────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}