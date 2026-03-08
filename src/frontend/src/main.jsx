import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { AppProvider } from './context/AppContext';
import App from './App.jsx';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const AUTH0_ENABLED = Boolean(domain && clientId && audience);

const appTree = (
  <BrowserRouter>
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {AUTH0_ENABLED ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience,
          scope: 'openid profile email',
        }}
        cacheLocation="memory"
        useRefreshTokens={false}
      >
        {appTree}
      </Auth0Provider>
    ) : (
      appTree
    )}
  </StrictMode>,
);