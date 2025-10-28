/**
 * Header - Adaptive Navigation Bar
 *
 * **Purpose:** Fixed header with context-aware navigation. Shows different UI based on current
 * page: game controls during Bingo, landing navigation on home page, minimal nav on pitch deck.
 *
 * **Layouts:**
 *
 * **Game Page (/game/:roomId):**
 * - "Leave Game" button (with confirmation) | Player count badge | Room ID badge
 *
 * **Landing Page (/):**
 * - FundRaisely logo | Navigation links (How It Works, Benefits, FAQ) | Pitch Deck link | Wallet button
 *
 * **Pitch Deck Page (/pitch-deck):**
 * - FundRaisely logo | "Back to Home" link | Wallet button
 *
 * **Features:**
 * - Fixed positioning (stays at top during scroll)
 * - Backdrop blur effect for glassmorphism
 * - Real-time player count from Zustand store
 * - Confirmation dialog before leaving game
 *
 * @component
 * @category Layout
 */

import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad2 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { WalletButton } from '../wallet/WalletButton';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { players } = useGameStore();
  const isGamePage = location.pathname.startsWith('/game/');
  const isPitchDeckPage = location.pathname === '/pitch-deck';
  const roomId = isGamePage ? location.pathname.split('/').pop() : '';
  
  const handleBack = () => {
    if (isGamePage) {
      if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
        navigate('/');
      }
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {isGamePage ? (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline font-medium">Leave Game</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 rounded-full text-sm">
                <Users size={16} className="text-indigo-600" />
                <span className="text-indigo-800 font-medium">{players.length}</span>
              </div>
              
              <div className="px-3 py-1.5 bg-green-100 rounded-full">
                <span className="text-sm text-green-800 font-medium">
                  Room: {roomId}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">FundRaisely</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {!isPitchDeckPage && (
                <>
                  <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">How It Works</a>
                  <a href="#benefits" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Benefits</a>
                  <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">FAQ</a>
                </>
              )}
              {!isPitchDeckPage && (
                <Link to="/pitch-deck" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Pitch Deck</Link>
              )}
              {isPitchDeckPage && (
                <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Back to Home</Link>
              )}
              <WalletButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}