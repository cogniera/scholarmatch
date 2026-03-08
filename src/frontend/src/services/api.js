/**
 * api.js — All backend API calls in one place
 *
 * Every function here talks to your FastAPI backend.
 * Uses either bearer token auth (legacy) or X-User-Id (no-auth mode).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function parseChecksHeader(headerValue) {
  if (!headerValue) return [];

  try {
    const parsed = JSON.parse(headerValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save Cloudinary URLs to the backend (Supabase).
 * Called after a successful Cloudinary upload.
 *
 * @param {string} userId - Profile id persisted in local storage
 * @param {{ resume_url?: string, transcript_url?: string }} urls
 */
function buildAuthHeaders({ token, userId, includeJson = false } = {}) {
  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  return headers;
}

export async function saveUploadUrls(userId, urls, token = null) {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: buildAuthHeaders({ token, userId, includeJson: true }),
    body: JSON.stringify(urls),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to save upload URL');
  }

  return res.json();
}

/**
 * Create a new user profile on the backend.
 *
 * @param {object} profileData - Profile data to create
 * @param {string|null} userId - Optional existing user id for idempotent retries
 */
export async function createProfile(profileData, userId = null) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: buildAuthHeaders({ userId, includeJson: true }),
    body: JSON.stringify(profileData),
  });

  const backendChecks = parseChecksHeader(res.headers.get('x-profile-checks'));

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.detail;
    const message = typeof detail === 'string'
      ? detail
      : detail?.message || 'Failed to create profile';

    const apiError = new Error(message);
    apiError.status = res.status;
    apiError.checks = Array.isArray(detail?.checks) ? detail.checks : backendChecks;
    throw apiError;
  }

  const profile = await res.json();

  // Treat malformed success payloads as failure so UI does not navigate forward.
  if (!profile || typeof profile !== 'object' || !profile.id) {
    const apiError = new Error('Profile was not saved correctly. Please try again.');
    apiError.status = 500;
    apiError.checks = backendChecks;
    throw apiError;
  }

  return { profile, checks: backendChecks };
}

/**
 * Create profile first; if it already exists for this user id, update it.
 *
 * @param {object} profileData - Profile data to create or update
 * @param {string|null} userId - Existing user id from local storage
 */
export async function createOrUpdateProfile(profileData, userId = null) {
  try {
    const created = await createProfile(profileData, userId);
    return { ...created, mode: 'create' };
  } catch (error) {
    const isAlreadyExists = error?.status === 409 && Boolean(userId);
    if (!isAlreadyExists) {
      throw error;
    }

    const profile = await updateProfile(userId, profileData);
    const checks = [
      ...(Array.isArray(error.checks) ? error.checks : []),
      {
        layer: 'frontend',
        step: 'existing_profile_fallback',
        status: 'ok',
        message: 'Profile exists. Applied PATCH /profile update instead.',
      },
    ];

    return { profile, checks, mode: 'update' };
  }
}

/**
 * Update the current user's profile on the backend.
 *
 * @param {string} userId - Profile id persisted in local storage
 * @param {object} profileData - Profile data to update
 */
export async function updateProfile(userId, profileData, token = null) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'PATCH',
    headers: buildAuthHeaders({ token, userId, includeJson: true }),
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update profile');
  }

  return res.json();
}

/**
 * Fetch current user's profile from backend.
 *
 * @param {string} userId - Profile id persisted in local storage
 */
export async function fetchProfile(userId, token = null) {
  const res = await fetch(`${BASE_URL}/profile`, {
    headers: buildAuthHeaders({ token, userId }),
  });

  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

/**
 * Fetch matched scholarships for the current user.
 * Set explain=true to include AI explanations (slower).
 *
 * @param {string} userId - Profile id persisted in local storage
 * @param {boolean} explain - include Gemini AI explanations
 */
export async function fetchMatches(userId, explain = false, token = null) {
  const res = await fetch(`${BASE_URL}/scholarships/match?explain=${explain}`, {
    headers: buildAuthHeaders({ token, userId }),
  });

  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

/**
 * Send a chat message to the AI assistant.
 *
 * @param {string} userId - Profile id persisted in local storage
 * @param {string} question
 * @param {number|null} scholarshipId - optional scholarship context
 */
export async function sendChatMessage(userId, question, scholarshipId = null, token = null) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: buildAuthHeaders({ token, userId, includeJson: true }),
    body: JSON.stringify({
      question,
      scholarship_id: scholarshipId,
      include_profile: true,
    }),
  });

  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}