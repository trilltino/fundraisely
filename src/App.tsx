/**
 * APP.TSX - Root Application Component
 *
 * This is the main entry point component for the Fundraisely application, a blockchain-based
 * fundraising platform that combines Bingo and Quiz games with Solana smart contracts. This
 * component serves as the application shell, managing routing, navigation guards, and global
 * layout concerns.
 *
 * ROLE IN THE APPLICATION:
 * - Defines the complete routing structure for all game modes (Bingo, Quiz, pitch decks)
 * - Implements navigation guards to prevent accidental game exits
 * - Manages the global error boundary to catch and display runtime errors
 * - Coordinates the application header visibility based on current route
 * - Initializes the Solana token registry for blockchain interactions
 *
 * ROUTES DEFINED:
 * - / : Landing page with game selection and wallet connection
 * - /game/:roomId : Live Bingo game room with real-time multiplayer
 * - /quiz : Quiz challenge creation and configuration
 * - /quiz/game/:roomId/:playerId : Quiz waiting room before game starts
 * - /quiz/play/:roomId/:playerId : Active quiz gameplay
 * - /host-dashboard/:roomId : Host control panel for managing games
 * - /pitch-deck : Investor pitch deck presentation mode
 * - /BingoBlitz : Test campaign page for demo purposes
 *
 * NAVIGATION PROTECTION:
 * The component implements browser navigation guards to prevent users from accidentally
 * leaving active games, which would result in loss of progress and potential financial
 * implications due to blockchain transactions. Both browser refresh (beforeunload) and
 * back button (popstate) are intercepted with confirmation dialogs.
 *
 * DEPENDENCIES:
 * - React Router for client-side routing
 * - ErrorBoundary for graceful error handling
 * - TokenRegistrySetup for Solana SPL token metadata
 * - Various page components for different game modes
 */

import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';
import { TestCampaign } from './pages/TestCampaign';
import { Header } from './components/layout/Header';
import { PitchDeck } from './pages/PitchDeck';
import { PitchDeckContent } from './pages/PitchDeckContent';
import ErrorBoundary from './components/common/ErrorBoundary';
import HostDashboard from './components/Quiz/dashboard/HostDashboard';
import QuizChallengePage from './pages/QuizChallengePage';
import QuizGameWaitingPage from './pages/QuizGameWaitingPage';
import JoinQuizWeb2Page from '../src/components/Quiz/joinroom/JoinQuizWeb2Page';
import QuizGamePlayPage from './pages/QuizGamePlayPage';
import { TokenRegistrySetup } from './components/wallet/TokenRegistrySetup';




export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (location.pathname.startsWith('/game/')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname.startsWith('/game/')) {
        if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
          navigate('/');
        } else {
          window.history.pushState(null, '', location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, location]);

  const showHeader = location.pathname !== '/pitch-deck-content' && location.pathname !== '/BingoBlitz';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <TokenRegistrySetup />
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/pitch-deck" element={<PitchDeck />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/BingoBlitz" element={<TestCampaign />} /> {/* Add the new route */}
            <Route path="/host-dashboard/:roomId" element={<HostDashboard />} />
            <Route path="/quiz" element={<QuizChallengePage />} />
            <Route path="/quiz/game/:roomId/:playerId" element={<QuizGameWaitingPage />} />
            <Route path="/join/:roomId" element={<JoinQuizWeb2Page />} />
            <Route path="/quiz/play/:roomId/:playerId" element={<QuizGamePlayPage />} />
             <Route path="/test" element={<QuizGamePlayPage />} />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}