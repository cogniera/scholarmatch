import { demoProfile } from '../data/demoProfile';
import { scholarships } from '../data/scholarships';
import { notifications } from '../data/notifications';

export const initialState = {
  isAuthenticated: false,
  profile: null,
  resumeUrl: null,
  resumePublicId: null,
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
    case 'SET_PROFILE':
      return { ...state, profile: action.payload, isAuthenticated: true };
    case 'SET_DEMO_PROFILE':
      return { ...state, profile: demoProfile, isAuthenticated: true };
    case 'SET_RESUME_URL':
      return { ...state, resumeUrl: action.payload.url, resumePublicId: action.payload.publicId };
    case 'SET_PROFILE_IMAGE':
      return { ...state, profileImageUrl: action.payload.url, profileImagePublicId: action.payload.publicId };
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
    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    case 'UPDATE_ROADMAP_STEP':
      return {
        ...state,
        roadmapSteps: state.roadmapSteps.map(step =>
          step.id === action.payload.id ? { ...step, ...action.payload } : step
        ),
      };
    case 'LOGOUT':
      return { ...initialState, isAuthenticated: false, profile: null };
    default:
      return state;
  }
}
