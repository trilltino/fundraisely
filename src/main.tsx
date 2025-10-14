/**
 * Application Entry Point
 *
 * Initializes and renders the Fundraisely React application into the DOM.
 * Sets up React 18 concurrent features with StrictMode for development checks.
 * Serves as the mounting point for the entire application tree including routing,
 * wallet providers, and global context. All application-level providers and
 * configuration are initialized in App.tsx before rendering page components.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
