// src/services/api.ts

import { apiClient } from '../lib/apiClient';
import type {
  FormDefinition,
  Submission,
  SubmissionStatus,
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

  submitForm: async (formId: number, formTitle: string, data: Record<string, unknown>): Promise<{ submission_id: number }> => {
    const res = await apiClient.post<{ message: string; submission_id: number }>(`/api/forms/${formId}/submit`, {
      form_type: formTitle,
      data,
    });
    return res.data;
  },

  // Admin: update submission status
  updateSubmissionStatus: async (formId: number, submissionId: number, status: SubmissionStatus): Promise<Submission> => {
    const res = await apiClient.patch<Submission>(`/api/forms/${formId}/submissions/${submissionId}/status`, { status });
    return res.data;
  },

  // Admin: edit any submission data
  adminUpdateSubmission: async (formId: number, submissionId: number, data: Record<string, unknown>): Promise<Submission> => {
    const res = await apiClient.put<Submission>(`/api/forms/${formId}/submissions/${submissionId}`, { data });
    return res.data;
  },
};

// ── Submissions (user-facing) ──────────────────────────────────────────────

export const submissionAPI = {
  mine: async (): Promise<Submission[]> => {
    const res = await apiClient.get<Submission[]>('/api/submissions/mine');
    return res.data;
  },

  get: async (id: number): Promise<Submission> => {
    const res = await apiClient.get<Submission>(`/api/submissions/${id}`);
    return res.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Submission> => {
    const res = await apiClient.put<Submission>(`/api/submissions/${id}`, { data });
    return res.data;
  },
};

// ── Lookup Configs ─────────────────────────────────────────────────────────

export interface LookupFieldMapping {
  key: string;
  label: string;
}

export interface LookupConfigResponse {
  id: number;
  name: string;
  description?: string;
  base_url: string;
  search_endpoint: string;
  search_method: string;
  auth_type: string;
  has_token: boolean;
  auth_header_name?: string;
  results_path?: string;
  value_field: string;
  display_field: string;
  field_mappings: LookupFieldMapping[];
  test_query?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LookupConfigCreate {
  name: string;
  description?: string;
  base_url: string;
  search_endpoint: string;
  search_method?: string;
  auth_type?: string;
  auth_token?: string;
  auth_header_name?: string;
  results_path?: string;
  value_field?: string;
  display_field?: string;
  test_query?: string;
  field_mappings?: LookupFieldMapping[];
}

export interface LookupQueryResult {
  value: string;
  display: string;
  fields: Record<string, string>;
}

export interface LookupQueryResponse {
  found: boolean;
  results: LookupQueryResult[];
  error?: string;
}

export const lookupAPI = {
  listConfigs: async (): Promise<LookupConfigResponse[]> => {
    const res = await apiClient.get<LookupConfigResponse[]>('/api/lookup/configs');
    return res.data;
  },

  listActiveConfigs: async (): Promise<LookupConfigResponse[]> => {
    const res = await apiClient.get<LookupConfigResponse[]>('/api/lookup/configs/active');
    return res.data;
  },

  getConfig: async (id: number): Promise<LookupConfigResponse> => {
    const res = await apiClient.get<LookupConfigResponse>(`/api/lookup/configs/${id}`);
    return res.data;
  },

  createConfig: async (data: LookupConfigCreate): Promise<LookupConfigResponse> => {
    const res = await apiClient.post<LookupConfigResponse>('/api/lookup/configs', data);
    return res.data;
  },

  updateConfig: async (id: number, data: Partial<LookupConfigCreate> & { is_active?: boolean }): Promise<LookupConfigResponse> => {
    const res = await apiClient.put<LookupConfigResponse>(`/api/lookup/configs/${id}`, data);
    return res.data;
  },

  deleteConfig: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/lookup/configs/${id}`);
  },

  testConfig: async (id: number): Promise<{ success: boolean; error?: string; sample_count?: number }> => {
    const res = await apiClient.post(`/api/lookup/configs/${id}/test`);
    return res.data;
  },

  discoverFields: async (id: number): Promise<{ fields: Array<{ path: string; sample_value: string; type: string }>; error?: string }> => {
    const res = await apiClient.post(`/api/lookup/configs/${id}/discover-fields`);
    return res.data;
  },

  query: async (configId: number, query: string): Promise<LookupQueryResponse> => {
    const res = await apiClient.post<LookupQueryResponse>('/api/lookup/query', {
      config_id: configId,
      query,
    });
    return res.data;
  },

};

