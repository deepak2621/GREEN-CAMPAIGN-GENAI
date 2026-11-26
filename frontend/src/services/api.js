/**
 * API service for Green Campaign AI.
 * Communicates with the Flask REST backend, attaches Bearer JWT headers,
 * and safely parses all HTTP/JSON/network responses without crashing on empty or HTML bodies.
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

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
  if (res && res.status === 401) {
    window.dispatchEvent(new CustomEvent('gc-auth-unauthorized'));
  }
  return res;
}

function defaultStatusMessage(status, fallbackMsg) {
  switch (status) {
    case 400:
      return 'Please enter a valid request and check your inputs.';
    case 401:
      return 'Your session expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested API resource was not found.';
    case 409:
      return 'A generation is already in progress. Please wait for it to finish.';
    case 413:
      return 'Request payload is too large.';
    case 422:
      return 'Image-generation model configuration is incomplete or unavailable.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'The server encountered an internal error. Please try again.';
    case 502:
    case 503:
      return 'Image-generation service is currently unavailable.';
    case 504:
      return 'Image generation took too long. Please try again.';
    case 507:
      return 'Not enough GPU memory to complete generation.';
    default:
      return fallbackMsg || 'Request failed. Please try again.';
  }
}

function normalizeGenerationMessage(data, status, fallbackMsg) {
  const rawMessage = (data?.message || data?.error || '').trim();
  const rawLower = rawMessage.toLowerCase();

  if (status === 507 || data?.error_code === 'GPU_MEMORY_EXHAUSTED' || rawLower.includes('out of memory')) {
    return 'Not enough GPU memory to complete generation. Try Fast Mode (512×512) and retry.';
  }
  if (status === 504 || data?.error_code === 'GENERATION_TIMEOUT' || rawLower.includes('timed out')) {
    return 'Image generation took too long. Please try again.';
  }
  if (
    status === 502 ||
    status === 503 ||
    data?.error_code === 'BACKEND_UNAVAILABLE' ||
    data?.error_code === 'MODEL_UNAVAILABLE'
  ) {
    return rawMessage || 'Image-generation service is currently unavailable.';
  }
  if (rawMessage) return rawMessage;
  return defaultStatusMessage(status, fallbackMsg);
}

export function buildApiError(data, statusCode, fallbackMsg) {
  const message = normalizeGenerationMessage(data, statusCode, fallbackMsg);
  const error = new Error(message);
  error.errorType = data?.error_type || (statusCode >= 500 ? 'ServerError' : 'ApiError');
  error.errorCode = data?.error_code || `HTTP_${statusCode || 0}`;
  error.validationErrors = data?.errors || null;
  error.fieldErrors = data?.errors || {};
  error.rateLimited = Boolean(data?.rate_limited);
  error.retryAfter = data?.retry_after || 0;
  error.requiresVerification = Boolean(data?.requires_verification);
  error.email = data?.email;
  error.statusCode = statusCode;
  return error;
}

/**
 * Safely parses any Fetch Response text body into JSON without ever throwing raw SyntaxError.
 */
export async function parseApiResponse(res, fallbackMsg = 'Request failed') {
  const status = res?.status || 0;
  let rawText = '';

  try {
    rawText = await res.text();
  } catch (readErr) {
    console.error('[GreenCampaignAPI] Failed reading response stream:', readErr);
    throw buildApiError(
      { error_code: 'STREAM_READ_ERROR', message: defaultStatusMessage(status, fallbackMsg) },
      status,
      fallbackMsg
    );
  }

  const trimmed = (rawText || '').trim();
  const contentType = (res?.headers?.get?.('content-type') || '').toLowerCase();

  if (!trimmed) {
    console.error(`[GreenCampaignAPI] Empty response body received (HTTP ${status}) from ${res?.url || 'API'}`);
    throw buildApiError(
      {
        error_code: status >= 500 || status === 0 ? 'BACKEND_UNAVAILABLE' : 'EMPTY_RESPONSE',
        error_type: 'EmptyResponseError',
        message: defaultStatusMessage(status, 'Image-generation service is currently unavailable.'),
      },
      status,
      fallbackMsg
    );
  }

  const looksLikeHtml = trimmed.startsWith('<!') || trimmed.startsWith('<html');
  let parsed = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch (parseErr) {
    console.error(
      `[GreenCampaignAPI] Invalid JSON response (HTTP ${status}, content-type=${contentType}):`,
      parseErr,
      trimmed.slice(0, 300)
    );
    throw buildApiError(
      {
        error_code: looksLikeHtml ? 'HTML_ERROR_RESPONSE' : 'INVALID_JSON_RESPONSE',
        error_type: 'MalformedResponseError',
        message: defaultStatusMessage(
          status,
          status >= 500
            ? 'Image-generation service is currently unavailable.'
            : 'Received an unexpected response format from the server. Please try again.'
        ),
      },
      status,
      fallbackMsg
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw buildApiError(
      {
        error_code: 'MALFORMED_RESPONSE',
        error_type: 'MalformedResponseError',
        message: 'Received an incomplete response from the server. Please try again.',
      },
      status,
      fallbackMsg
    );
  }

  if (!res.ok || parsed.success === false) {
    throw buildApiError(parsed, status, fallbackMsg);
  }

  return parsed;
}

/**
 * Shared fetch wrapper with timeout, network failure handling, auth 401 notification, and safe JSON parsing.
 */
export async function safeFetchJson(
  url,
  fetchOptions = {},
  { timeoutMs = 20000, fallbackMsg = 'Request failed', protectedRoute = false } = {}
) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId = null;

  if (controller && timeoutMs > 0 && !fetchOptions.signal) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  let res;
  try {
    res = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller?.signal,
    });
  } catch (networkErr) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error(`[GreenCampaignAPI] Network/fetch error for ${url}:`, networkErr);
    if (networkErr?.name === 'AbortError') {
      throw buildApiError(
        {
          error_code: 'TIMEOUT',
          error_type: 'TimeoutError',
          message: 'Image generation took too long. Please try again.',
        },
        504,
        fallbackMsg
      );
    }
    throw buildApiError(
      {
        error_code: 'BACKEND_UNAVAILABLE',
        error_type: 'NetworkError',
        message: 'Image-generation service is currently unavailable.',
      },
      503,
      fallbackMsg
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (protectedRoute && typeof window !== 'undefined') {
    await handleProtectedResponse(res);
  }

  return await parseApiResponse(res, fallbackMsg);
}

export async function checkHealth() {
  try {
    return await safeFetchJson(`${API_BASE}/health`, {}, { timeoutMs: 8000, fallbackMsg: 'Health check failed' });
  } catch (err) {
    return {
      status: 'offline',
      provider_ready: false,
      provider_note: 'Image-generation service is currently unavailable.',
      error: err.message,
    };
  }
}

export async function fetchConfig() {
  return await safeFetchJson(
    `${API_BASE}/config`,
    {},
    { timeoutMs: 10000, fallbackMsg: 'Failed to load application configuration' }
  );
}

export async function fetchCooldown() {
  try {
    return await safeFetchJson(`${API_BASE}/cooldown`, {}, { timeoutMs: 8000 });
  } catch {
    return { cooldown_remaining: 0, ready: true };
  }
}

export async function fetchSystemMetrics() {
  const data = await safeFetchJson(
    `${API_BASE}/system-metrics`,
    { headers: buildAuthHeaders() },
    { timeoutMs: 10000, fallbackMsg: 'Failed to load hardware telemetry', protectedRoute: true }
  );
  return data.data;
}

export async function previewPrompt(payload) {
  try {
    const data = await safeFetchJson(
      `${API_BASE}/preview-prompt`,
      {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      },
      { timeoutMs: 10000, fallbackMsg: 'Failed to preview prompt', protectedRoute: true }
    );
    return data.data;
  } catch {
    return null;
  }
}

export async function generateCampaignImage(payload) {
  const data = await safeFetchJson(
    `${API_BASE}/generate`,
    {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    },
    { timeoutMs: 310000, fallbackMsg: 'Failed to generate campaign image', protectedRoute: true }
  );
  const resolvedUrl = data?.data?.image_url || data?.image_url;
  if (!resolvedUrl) {
    throw buildApiError(
      { error_code: 'MISSING_IMAGE_URL', message: 'Generation finished without a valid image URL.' },
      502,
      'Failed to generate campaign image'
    );
  }
  return data;
}

export async function startGenerationJob(payload) {
  const data = await safeFetchJson(
    `${API_BASE}/generate/start`,
    {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    },
    { timeoutMs: 30000, fallbackMsg: 'Failed to start image generation', protectedRoute: true }
  );
  if (!data?.data?.job_id) {
    throw buildApiError(
      { error_code: 'MISSING_JOB_ID', message: 'Image-generation server returned an incomplete job response.' },
      502,
      'Failed to start image generation'
    );
  }
  return data.data;
}

export async function getGenerationStatus(jobId) {
  const data = await safeFetchJson(
    `${API_BASE}/generate/status/${encodeURIComponent(jobId)}`,
    { headers: buildAuthHeaders() },
    { timeoutMs: 12000, fallbackMsg: 'Failed to read generation progress', protectedRoute: true }
  );
  if (!data?.data) {
    throw buildApiError(
      { error_code: 'MALFORMED_STATUS', message: 'Generation status payload was incomplete.' },
      502,
      'Failed to read generation progress'
    );
  }
  return data.data;
}

export async function cancelGenerationJob(jobId) {
  return await safeFetchJson(
    `${API_BASE}/generate/cancel/${encodeURIComponent(jobId)}`,
    {
      method: 'POST',
      headers: buildAuthHeaders(),
    },
    { timeoutMs: 12000, fallbackMsg: 'Failed to cancel generation', protectedRoute: true }
  );
}

export async function fetchHistory() {
  return await safeFetchJson(
    `${API_BASE}/history`,
    { headers: buildAuthHeaders() },
    { timeoutMs: 15000, fallbackMsg: 'Failed to fetch campaign history', protectedRoute: true }
  );
}

export async function saveCampaignToHistory(payload) {
  return await safeFetchJson(
    `${API_BASE}/history`,
    {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to save campaign', protectedRoute: true }
  );
}

export async function deleteCampaignFromHistory(id) {
  return await safeFetchJson(
    `${API_BASE}/history/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: buildAuthHeaders(),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to delete campaign', protectedRoute: true }
  );
}

// ==========================================
// Authentication API Calls (Local Auth Mode)
// ==========================================

export async function apiAuthRegister(payload) {
  return await safeFetchJson(
    `${API_BASE}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { timeoutMs: 15000, fallbackMsg: 'Registration failed' }
  );
}

export async function apiAuthLogin(payload) {
  return await safeFetchJson(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { timeoutMs: 15000, fallbackMsg: 'Login failed' }
  );
}

export async function apiAuthVerifyEmail(token) {
  return await safeFetchJson(
    `${API_BASE}/auth/verify-email`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    },
    { timeoutMs: 15000, fallbackMsg: 'Verification failed' }
  );
}

export async function apiAuthResendVerification(email) {
  return await safeFetchJson(
    `${API_BASE}/auth/resend-verification`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to resend verification email' }
  );
}

export async function apiAuthForgotPassword(email) {
  return await safeFetchJson(
    `${API_BASE}/auth/forgot-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to request password reset' }
  );
}

export async function apiAuthResetPassword(payload) {
  return await safeFetchJson(
    `${API_BASE}/auth/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to reset password' }
  );
}

export async function apiAuthGetMe(tokenOverride) {
  const token = tokenOverride || getApiAuthToken();
  return await safeFetchJson(
    `${API_BASE}/auth/me`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    { timeoutMs: 10000, fallbackMsg: 'Invalid or expired session' }
  );
}

export async function apiAuthUpdateProfile(payload) {
  return await safeFetchJson(
    `${API_BASE}/auth/profile`,
    {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    },
    { timeoutMs: 15000, fallbackMsg: 'Failed to update profile', protectedRoute: true }
  );
}
