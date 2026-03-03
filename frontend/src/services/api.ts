// src/services/api.ts

import { apiClient } from '../lib/apiClient';
import type {
  FormDefinition,
  Submission,
  CRMLookupResult,
  User,
  TokenResponse,
  LoginRequest,
} from '../types';

// ── Auth ───────────────────────────────────────────────────────────────────

export const authAPI = {
  login: async (payload: LoginRequest): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/login', payload);
    return res.data;
  },

  // token param — fix for race condition: localStorage might not be ready yet
  me: async (token?: string): Promise<User> => {
    const res = await apiClient.get<User>('/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
  },
};

// ── Forms ──────────────────────────────────────────────────────────────────

export const formAPI = {
  list: async (): Promise<FormDefinition[]> => {
    const res = await apiClient.get<FormDefinition[]>('/api/forms/');
    return res.data;
  },

  get: async (id: number): Promise<FormDefinition> => {
    const res = await apiClient.get<FormDefinition>(`/api/forms/${id}`);
    return res.data;
  },

  create: async (form: Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<FormDefinition> => {
    const res = await apiClient.post<FormDefinition>('/api/forms/', form);
    return res.data;
  },

  update: async (id: number, form: Partial<FormDefinition>): Promise<FormDefinition> => {
    const res = await apiClient.put<FormDefinition>(`/api/forms/${id}`, form);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/forms/${id}`);
  },

  toggleActive: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/forms/${id}/toggle`);
  },

  getSubmissions: async (formId: number): Promise<Submission[]> => {
    const res = await apiClient.get<Submission[]>(`/api/forms/${formId}/submissions`);
    return res.data;
  },

  submitForm: async (formId: number, formTitle: string, data: Record<string, unknown>): Promise<void> => {
    await apiClient.post(`/api/forms/${formId}/submit`, {
      form_type: formTitle,
      data,
    });
  },
};

// ── CRM ────────────────────────────────────────────────────────────────────

export const crmAPI = {
  lookup: async (crmId: string): Promise<CRMLookupResult> => {
    const normalised = encodeURIComponent(crmId.trim().toUpperCase());
    const res = await apiClient.get<CRMLookupResult>(`/api/crm/lookup/${normalised}`);
    return res.data;
  },
};