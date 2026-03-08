import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { appReducer, initialState } from './appReducer';
import { fetchMatches, fetchScholarships } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  // ── Rehydrate profile on login ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check localStorage for existing profile
    const savedProfile = localStorage.getItem(`profile_${user.sub}`);

    if (savedProfile) {
      // Returning user — load saved profile and go to dashboard
      dispatch({ type: 'SET_PROFILE', payload: JSON.parse(savedProfile) });
      navigate('/dashboard/home');
    }
    // New user — stay on /create-profile (Auth0 already redirected them there)
  }, [isAuthenticated, user]);

  // ── Fetch real scholarships from backend ─────────────────────────────────
  // Runs on mount — tries personalized matches if logged in via Auth0,
  // then falls back to public endpoint, then demo data.
  useEffect(() => {
    let cancelled = false;

    async function loadScholarships() {
      // 1. Try personalized matches if Auth0-authenticated
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          const matched = await fetchMatches(token);

          if (!cancelled && matched.length > 0) {
            dispatch({ type: 'SET_SCHOLARSHIPS', payload: matched });
            console.log(`✅ Loaded ${matched.length} matched scholarships from backend`);
            return;
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch matched scholarships:', err.message);
        }
      }

      // 2. Try public endpoint (no auth needed — works in demo mode too)
      try {
        const all = await fetchScholarships({ limit: 50 });

        if (!cancelled && all.length > 0) {
          dispatch({ type: 'SET_SCHOLARSHIPS', payload: all });
          console.log(`✅ Loaded ${all.length} scholarships from public endpoint`);
          return;
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch public scholarships:', err.message);
      }

      // 3. If backend is unreachable, demo data from initialState stays
      console.log('ℹ️ Using demo scholarship data (backend unavailable)');
    }

    loadScholarships();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}