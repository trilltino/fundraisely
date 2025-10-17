/**
 * Vite Configuration
 *
 * This file configures Vite for the Fundraisely frontend application. It sets up:
 * - React plugin with fast refresh for development
 * - Node.js polyfills for blockchain libraries (Buffer, process, etc.)
 * - Path aliases for clean imports (@/, @components/, @hooks/, etc.)
 * - WebSocket proxy to connect to the game server on port 3001
 * - Optimized dependencies for Solana, Anchor, and game libraries
 * - Global definitions to ensure compatibility with browser environments
 *
 * The configuration ensures that blockchain libraries (Solana/Anchor) and game
 * dependencies (socket.io, framer-motion, canvas-confetti) work seamlessly in
 * the browser by providing necessary polyfills and optimizations.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      '@coral-xyz/anchor',
      'socket.io-client',
      'canvas-confetti',
      'framer-motion',
      'zustand',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      target: 'esnext',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
});
