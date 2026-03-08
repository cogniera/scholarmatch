import { demoProfile } from '../data/demoProfile';
import { scholarships } from '../data/scholarships';
import { notifications } from '../data/notifications';

export const initialState = {
  isAuthenticated: false,
  authToken: null,           // Auth0 access token — needed for backend API calls
  profile: null,
  chatOrganize: null,         // { sortBy, order, filterMinAmount, filterMinMatch } from chatbot
  scholarshipsForChat: [],     // Current scholarships for chat context (set by dashboard/scholarships pages)
  resumeUrl: null,
  resumePublicId: null,
  transcriptUrl: null,       // Added to match backend schema
  profileImageUrl: null,
  profileImagePublicId: null,
  scholarships: scholarships,
  savedScholarships: [],
  applications: [],
  notifications: notifications,
  roadmapSteps: [
    { id: 1, title: 'Maintain GPA above 3.5', description: 'Raise from 3.2 to 3.5 to unlock 4 merit-based awards.', status: 'in-progress', progress: 64, unlockValue: 18000, unlockCount: 4 },
    { id: 2, title: 'Add Leadership Experience', description: 'Join a club exec team. Required by many tier-1 scholarships.', status: 'locked', progress: 0, unlockValue: 25000, unlockCount: 5 },
    { id: 3, title: 'Complete 20h Community Service', description: 'Volunteer to qualify for the Community Builders Grant.', status: 'locked', progress: 0, unlockValue: 8000, unlockCount: 2 },
    { id: 4, title: 'Upload Official Transcript', description: 'Needed for formal verification on 6 scholarships.', status: 'locked', progress: 0, unlockValue: 35000, unlockCount: 6 },
    { id: 5, title: 'Obtain Recommendation Letter', description: 'A professor reference unlocks 3 additional awards.', status: 'locked', progress: 0, unlockValue: 15000, unlockCount: 3 },
  ],
};

export function appReducer(state, action) {
  switch (action.type) {

    // ── Auth ───────────────────────────────────────────────────────────────────
    case 'SET_AUTH_TOKEN':
      // Called after Auth0 login — stores token for backend API calls
      return { ...state, authToken: action.payload, isAuthenticated: true };

    case 'LOGOUT':
      return { ...initialState, isAuthenticated: false, profile: null, authToken: null };

    // ── Profile ────────────────────────────────────────────────────────────────
    case 'SET_PROFILE':
      return { ...state, profile: action.payload, isAuthenticated: true };

    case 'SET_DEMO_PROFILE':
      return { ...state, profile: demoProfile, isAuthenticated: true };

    case 'SET_PROFILE_FROM_BACKEND':
      // Rehydrates full profile from backend including resume/transcript URLs
      return {
        ...state,
        profile: action.payload,
        isAuthenticated: true,
        resumeUrl: action.payload.resume_url || state.resumeUrl,
        transcriptUrl: action.payload.transcript_url || state.transcriptUrl,
      };

    // ── Uploads ────────────────────────────────────────────────────────────────
    case 'SET_RESUME_URL':
      return {
        ...state,
        resumeUrl: action.payload.url,
        resumePublicId: action.payload.publicId,
      };

    case 'SET_TRANSCRIPT_URL':
      return {
        ...state,
        transcriptUrl: action.payload.url,
        transcriptPublicId: action.payload.publicId,
      };

    case 'SET_PROFILE_IMAGE':
      return {
        ...state,
        profileImageUrl: action.payload.url,
        profileImagePublicId: action.payload.publicId,
      };

    // ── Scholarships ───────────────────────────────────────────────────────────
    case 'SET_SCHOLARSHIPS':
      return { ...state, scholarships: action.payload };

    case 'SAVE_SCHOLARSHIP':
      if (state.savedScholarships.includes(action.payload)) return state;
      return { ...state, savedScholarships: [...state.savedScholarships, action.payload] };

    case 'UNSAVE_SCHOLARSHIP':
      return { ...state, savedScholarships: state.savedScholarships.filter(id => id !== action.payload) };

    case 'ADD_APPLICATION':
      return { ...state, applications: [...state.applications, action.payload] };

    case 'UPDATE_APPLICATION_STATUS':
      return {
        ...state,
        applications: state.applications.map(app =>
          app.id === action.payload.id ? { ...app, status: action.payload.status } : app
        ),
      };

    // ── Notifications ──────────────────────────────────────────────────────────
    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    // ── Roadmap ────────────────────────────────────────────────────────────────
    case 'UPDATE_ROADMAP_STEP':
      return {
        ...state,
        roadmapSteps: state.roadmapSteps.map(step =>
          step.id === action.payload.id ? { ...step, ...action.payload } : step
        ),
      };

    // ── Chatbot ─────────────────────────────────────────────────────────────────
    case 'SET_CHAT_ORGANIZE':
      return { ...state, chatOrganize: action.payload };
    case 'SET_SCHOLARSHIPS_FOR_CHAT':
      return { ...state, scholarshipsForChat: action.payload };

    default:
      return state;
  }
}
