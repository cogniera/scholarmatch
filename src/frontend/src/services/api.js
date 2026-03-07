/**
 * api.js — All backend API calls in one place
 *
 * Every function here talks to your FastAPI backend.
 * The Auth0 token is passed in so protected routes work.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
 * Fetch the current user's profile from the backend.
 * Used to rehydrate state after page refresh.
 *
 * @param {string} token - Auth0 access token
 */
export async function fetchProfile(token) {
  const res = await fetch(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null; // Profile doesn't exist yet
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

/**
 * Create a new student profile.
 *
 * @param {string} token - Auth0 access token
 * @param {object} profileData
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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create profile');
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