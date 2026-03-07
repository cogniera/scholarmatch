import { createContext, useContext, useReducer, useEffect } from 'react';
import { appReducer, initialState } from './appReducer';
import { fetchProfile } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  /**
   * When a user logs in (authToken appears in state), fetch their full
   * profile from the backend. This rehydrates resumeUrl, transcriptUrl,
   * and all profile fields so they persist across page refreshes.
   */
  useEffect(() => {
    if (!state.authToken) return;

    fetchProfile(state.authToken)
      .then((profile) => {
        if (profile) {
          dispatch({ type: 'SET_PROFILE_FROM_BACKEND', payload: profile });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch profile from backend:', err);
      });
  }, [state.authToken]);

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
