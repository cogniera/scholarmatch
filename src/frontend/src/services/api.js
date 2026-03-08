/**
 * api.js — All backend API calls in one place
 *
 * Every function here talks to your FastAPI backend.
 * The Auth0 token is passed in so protected routes work.
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
 * @param {string} token - Auth0 access token
 * @param {{ resume_url?: string, transcript_url?: string }} urls
 */
export async function saveUploadUrls(token, urls) {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
 * @param {string} token - Auth0 access token
 * @param {object} profileData - Profile data to create
 */
export async function createProfile(token, profileData) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
  return { profile, checks: backendChecks };
}

/**
 * Update the current user's profile on the backend.
 *
 * @param {string} token - Auth0 access token
 * @param {object} profileData - Profile data to update
 */
export async function updateProfile(token, profileData) {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update profile');
  }

  return res.json();
}

/**
 * Fetch matched scholarships for the current user.
 * Set explain=true to include AI explanations (slower).
 *
 * @param {string} token - Auth0 access token
 * @param {boolean} explain - include Gemini AI explanations
 */
export async function fetchMatches(token, explain = false) {
  const res = await fetch(`${BASE_URL}/scholarships/match?explain=${explain}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

/**
 * Send a chat message to the AI assistant.
 *
 * @param {string} token - Auth0 access token
 * @param {string} question
 * @param {number|null} scholarshipId - optional scholarship context
 */
export async function sendChatMessage(token, question, scholarshipId = null) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      scholarship_id: scholarshipId,
      include_profile: true,
    }),
  });

  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}