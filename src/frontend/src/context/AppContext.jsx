import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { appReducer, initialState } from './appReducer';
import { fetchProfile } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    getAccessTokenSilently().then(async (token) => {
      dispatch({ type: 'SET_AUTH_TOKEN', payload: token });

      const profile = await fetchProfile(token);

      if (profile) {
        // Returning user — load profile and go straight to dashboard
        dispatch({ type: 'SET_PROFILE_FROM_BACKEND', payload: profile });
        navigate('/dashboard/home');
      } else {
        // New user — send to create profile
        navigate('/create-profile');
      }
    }).catch(console.error);
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