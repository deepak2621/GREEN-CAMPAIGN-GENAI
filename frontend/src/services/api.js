/**
 * API service for Green Campaign AI.
 * Communicates with the Flask REST backend and attaches Bearer JWT authentication headers.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let runtimeAuthToken = '';

export function setApiAuthToken(token) {
  runtimeAuthToken = token || '';
}

export function getApiAuthToken() {
  if (runtimeAuthToken) return runtimeAuthToken;
  try {
    return (
      localStorage.getItem('gc_access_token') ||
      sessionStorage.getItem('gc_access_token') ||
      ''
    );
  } catch {
    return '';
  }
}

function buildAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getApiAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleProtectedResponse(res) {
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('gc-auth-unauthorized'));
  }
  return res;
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      provider_ready: false,
      provider_note: 'Backend service unreachable. Please ensure Flask is running.',
      error: err.message
    };
  }
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to load application configuration');
  return await res.json();
}

export async function fetchCooldown() {
  try {
    const res = await fetch(`${API_BASE}/cooldown`);
    if (!res.ok) return { cooldown_remaining: 0, ready: true };
    return await res.json();
  } catch {
    return { cooldown_remaining: 0, ready: true };
  }
}

export async function previewPrompt(payload) {
  try {
    const res = await fetch(`${API_BASE}/preview-prompt`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateCampaignImage(payload) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  await handleProtectedResponse(res);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Failed to generate campaign image');
    error.errorType = data.error_type || 'UnknownError';
    error.validationErrors = data.errors || null;
    error.rateLimited = data.rate_limited || false;
    error.retryAfter = data.retry_after || 30;
    error.statusCode = res.status;
    throw error;
  }
  return data;
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/history`, {
    headers: buildAuthHeaders()
  });
  await handleProtectedResponse(res);
  if (!res.ok) throw new Error('Failed to fetch campaign history');
  return await res.json();
}

export async function saveCampaignToHistory(payload) {
  const res = await fetch(`${API_BASE}/history`, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  await handleProtectedResponse(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save campaign');
  return data;
}

export async function deleteCampaignFromHistory(id) {
  const res = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
    headers: buildAuthHeaders()
  });
  await handleProtectedResponse(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete campaign');
  return data;
}

// ==========================================
// Authentication API Calls (Local Auth Mode)
// ==========================================

export async function apiAuthRegister(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Registration failed');
    err.errorType = data.error_type;
    err.fieldErrors = data.errors || {};
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

export async function apiAuthLogin(payload) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Login failed');
    err.errorType = data.error_type;
    err.fieldErrors = data.errors || {};
    err.requiresVerification = Boolean(data.requires_verification);
    err.email = data.email;
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

export async function apiAuthVerifyEmail(token) {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Verification failed');
  }
  return data;
}

export async function apiAuthResendVerification(email) {
  const res = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to resend verification email');
  }
  return data;
}

export async function apiAuthForgotPassword(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to request password reset');
    err.fieldErrors = data.errors || {};
    throw err;
  }
  return data;
}

export async function apiAuthResetPassword(payload) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to reset password');
    err.fieldErrors = data.errors || {};
    throw err;
  }
  return data;
}

export async function apiAuthGetMe(tokenOverride) {
  const token = tokenOverride || getApiAuthToken();
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    throw new Error('Invalid or expired session');
  }
  return await res.json();
}

export async function apiAuthUpdateProfile(payload) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  await handleProtectedResponse(res);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to update profile');
    err.fieldErrors = data.errors || {};
    throw err;
  }
  return data;
}
