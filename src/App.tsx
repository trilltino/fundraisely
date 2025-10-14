/**
 * Application Root Component
 *
 * Orchestrates the core application architecture by configuring routing and Solana wallet integration.
 * Wraps the entire app in SolanaWalletProvider to enable blockchain connectivity across all pages.
 * Defines three main routes: HomePage (landing/features), CreateRoomPage (room setup with entry fees),
 * and RoomPage (live room with player management). All pages inherit wallet context and connection
 * state from the provider hierarchy. Applies consistent gradient background styling across routes.
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SolanaWalletProvider } from '@/chains/solana/SolanaWalletProvider';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';
import CreateRoomPage from '@/pages/CreateRoomPage';

function App() {
  return (
    <SolanaWalletProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateRoomPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </div>
      </Router>
    </SolanaWalletProvider>
  );
}

export default App;
