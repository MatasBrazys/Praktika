// src/lib/apiClient.ts

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_URL   = import.meta.env.VITE_API_URL as string
const TOKEN_KEY = 'auth_token'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ────────────────────────────────────────────────────
// Only attach token from localStorage if Authorization header not already set.
// This allows me(token) to pass the token directly without being overwritten.

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.headers.Authorization) {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — handle 401 globally ────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?reason=session_expired'
      }
    }
    return Promise.reject(error)
  },
)

// ── Token helpers ──────────────────────────────────────────────────────────

export const tokenStorage = {
  get:   ():              string | null => localStorage.getItem(TOKEN_KEY),
  set:   (token: string): void         => localStorage.setItem(TOKEN_KEY, token),
  clear: ():              void         => localStorage.removeItem(TOKEN_KEY),
}

// ── Error utility ──────────────────────────────────────────────────────────

interface ValidationError { msg?: string }

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return (detail as ValidationError[]).map(d => d.msg ?? '').filter(Boolean).join(', ')
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}