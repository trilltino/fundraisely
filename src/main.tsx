/**
 * MAIN.TSX - Application Entry Point
 *
 * This file initializes and renders the Fundraisely React application into the DOM. It establishes
 * the foundational provider hierarchy that enables all blockchain, state management, and routing
 * functionality throughout the entire application. Every component in the app tree inherits these
 * capabilities through React context.
 *
 * ROLE IN THE APPLICATION:
 * This is the first JavaScript file executed when the application loads. It creates the React root,
 * establishes global providers, and mounts the App component. The provider hierarchy determines what
 * capabilities are available to all descendant components.
 *
 * PROVIDER HIERARCHY (outer to inner):
 * 1. StrictMode - Enables React development checks and warnings
 * 2. QueryClientProvider - Provides React Query for server state management and caching
 * 3. SolanaWalletProvider - Provides Solana wallet connection and blockchain transaction capabilities
 * 4. BrowserRouter - Enables client-side routing with React Router
 * 5. App - The root application component with all route definitions
 *
 * REACT QUERY CONFIGURATION:
 * The QueryClient is configured with application-specific defaults:
 * - 5 minute stale time for query freshness
 * - 10 minute garbage collection for unused cache entries
 * - Automatic refetch on reconnection for resilience
 * - Exponential backoff retry strategy with max 30s delay
 * - No automatic mutation retries (blockchain transactions should be explicit)
 *
 * DEPENDENCIES:
 * - React 18 with concurrent features and StrictMode
 * - React Query for server state management
 * - Solana wallet adapters for blockchain connectivity
 * - React Router for SPA navigation
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SolanaWalletProvider } from './chains/solana/SolanaWalletProvider';
import App from './App.tsx';
import './index.css';

// Create QueryClient for React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when internet reconnects
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations automatically
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SolanaWalletProvider>
      {/* React Query DevTools - only visible in development */}
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
    </QueryClientProvider>
  </StrictMode>
);
