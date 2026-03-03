// src/types/index.ts
//
// WHY single file: every type is imported from here — no circular deps,
// no hunting across files to find where FormDefinition lives.
//
// POST-MVP: split into types/auth.ts, types/forms.ts etc if this grows > 150 lines.

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

export interface Submission {
  id: number;
  form_id: number;
  form_type: string;
  data: Record<string, unknown>;
  created_at: string;
}

// ── CRM ────────────────────────────────────────────────────────────────────

export interface CRMLookupResult {
  found: boolean;
  crm_id: string;
  name: string;
  street: string;
  postcode: string;
  state: string;
}

// ── Toast (UI) ─────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;             // ms, default 4000
}