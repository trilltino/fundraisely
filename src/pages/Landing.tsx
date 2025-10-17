/**
 * LANDING.TSX - Application Landing Page
 *
 * This is the main marketing and entry page for the Fundraisely application. It serves as the
 * primary conversion funnel, presenting the value proposition, features, benefits, and calls-to-action
 * for both game hosts and players. The page follows a traditional landing page structure with hero,
 * features, benefits, FAQ, and CTA sections.
 *
 * ROLE IN THE APPLICATION:
 * - Primary entry point for new users discovering the platform
 * - Educates users about blockchain-based fundraising games (Bingo and Quiz)
 * - Provides direct access to the Bingo Blitz test campaign
 * - Handles state cleanup when users return from active games
 * - Initializes wallet operations for blockchain connectivity
 * - Serves as the "home" destination after game completion or navigation
 *
 * PAGE STRUCTURE:
 * 1. SolanaWalletOperations - Wallet connection status and actions
 * 2. Headers - Site navigation and branding
 * 3. HeroSection - Main headline and primary CTA
 * 4. Campaign Link Section - Featured link to Bingo Blitz test campaign
 * 5. HowItWorks - Step-by-step explanation of the platform
 * 6. Benefits - Value propositions for hosts and players
 * 7. FAQ - Common questions and answers
 * 8. FundRaiselyWhereYouSave - Cost savings breakdown
 * 9. CTASection - Final conversion prompts
 * 10. Hfooter - Footer with links and legal info
 *
 * STATE CLEANUP:
 * On mount, this component performs aggressive cleanup to ensure fresh starts:
 * - Resets all game state via gameStore
 * - Clears all room data from localStorage
 * - Removes wallet adapter cached data
 * - Clears portfolio cache and debug flags
 * This prevents state leakage between gaming sessions and ensures users start clean.
 *
 * NAVIGATION INTEGRATION:
 * - Links to /BingoBlitz for the test campaign experience
 * - Acts as the default route (/) in the application
 * - Receives users returning from /game/:roomId after completion
 * - Provides navigation to quiz creation (/quiz) via CTAs
 *
 * DEPENDENCIES:
 * - React Router for navigation links
 * - Zustand gameStore for state reset
 * - localStorage utilities for data cleanup
 * - Multiple presentational components for page sections
 * - SolanaWalletOperations for blockchain wallet integration
 */

import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { clearAllRoomData } from '../utils/localStorageUtils';
import Headers from '../components/layout/Headers';
import HeroSection from '../components/landing/HeroSection';
import HowItWorks from '../components/landing/HowItWorks';
import FAQ from '../components/landing/FAQ';
import CTASection from '../components/landing/CTASection';
import Benefit from '../components/landing/Benefits';
import Hfooter from '../components/layout/Footer';
import { Link } from 'react-router-dom';
import FundRaiselyWhereYouSave from './savings';
import SolanaWalletOperations from '../components/wallet/SolanaWalletOperations';



export function Landing() {
  const { resetGameState } = useGameStore((state) => ({
    resetGameState: state.resetGameState,
  }));
  
  useEffect(() => {
    resetGameState();
    clearAllRoomData();
    
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('@appkit/portfolio_cache');
      localStorage.removeItem('lace-wallet-mode');
      localStorage.removeItem('debug');
    } catch (e) {
      console.error('Error cleaning up storage:', e);
    }
  }, [resetGameState]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <SolanaWalletOperations />
   
      <Headers />
      <HeroSection />
      
      {/* Campaign Link Section - Reduced padding from py-12 to py-8 */}
      <div className="container mx-auto px-4 max-w-6xl mt-4 mb-4">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-8 py-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Try Our Bingo Blitz: Chain Challenge?
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-6">
              We've created a special Bingo Blitz: Chain Challenge.
              Whether you want to host a game or join as a player, you can experience our blockchain-based
              gaming platform in action.
            </p>
            <Link 
              to="/BingoBlitz"
              className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-50 transition inline-block"
            >
              Check Out Our Bingo Blitz: Chain Challenge
            </Link>
          </div>
        </div>
      </div>
     
         
      <HowItWorks />
      <Benefit />
      <FAQ />
       <FundRaiselyWhereYouSave />
      <CTASection />
      <Hfooter />
    </div>
  );
}



