import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { appReducer, initialState } from './appReducer';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const syncAuthToken = async () => {
      if (!isAuthenticated) {
        dispatch({ type: 'LOGOUT' });
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        if (!cancelled && token) {
          dispatch({ type: 'SET_AUTH_TOKEN', payload: token });
        }
      } catch (err) {
        // Keep UI usable even if token refresh fails; per-page flows can recover interactively.
        if (!cancelled) {
          console.error('Failed to sync Auth0 access token:', err);
        }
      }
    };

    syncAuthToken();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, getAccessTokenSilently]);

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