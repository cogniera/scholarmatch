import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { appReducer, initialState } from './appReducer';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();

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