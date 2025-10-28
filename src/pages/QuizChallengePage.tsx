/**
 * QUIZCHALLENGEPAGE.TSX - Quiz Mode Entry Point
 *
 * This is the landing page for the Quiz Challenge feature, serving as the primary decision point
 * where users choose between hosting a new quiz game or joining an existing one. This page provides
 * a clean, focused interface with two clear call-to-action buttons that launch their respective
 * workflows via modal components.
 *
 * ROLE IN THE APPLICATION:
 * - Entry point for all quiz-related activities (accessed via /quiz route)
 * - Provides clear separation between host and player workflows
 * - Acts as a funnel to guide users into the appropriate quiz experience
 * - Serves as the home base for quiz mode, similar to how Landing page serves Bingo mode
 * - Accessible from the main navigation and landing page CTAs
 *
 * USER FLOWS:
 * 1. Host Flow:
 *    - User clicks "Host a Quiz" button
 *    - QuizWizard modal opens with multi-step quiz creation form
 *    - Host configures quiz settings (questions, rounds, prizes, entry fee)
 *    - Upon completion, navigates to host dashboard (/host-dashboard/:roomId)
 *
 * 2. Player Flow:
 *    - User clicks "Join a Quiz" button
 *    - JoinQuizModal opens with room code input
 *    - Player enters room code and player name
 *    - Upon successful join, navigates to waiting page (/quiz/game/:roomId/:playerId)
 *
 * STATE MANAGEMENT:
 * - showWizard: Controls visibility of QuizWizard modal for host setup
 * - showJoinModal: Controls visibility of JoinQuizModal for player join
 * - Both modals are conditionally rendered and unmounted when closed
 *
 * DESIGN PHILOSOPHY:
 * This page follows the principle of progressive disclosure - users only see the options they need,
 * and additional complexity (quiz configuration, room joining) is revealed through modals. This keeps
 * the initial experience simple while supporting complex workflows.
 *
 * NAVIGATION INTEGRATION:
 * - Accessible from App.tsx route: /quiz
 * - Referenced in landing page CTAs for quiz mode
 * - Starting point for all quiz-related user journeys
 * - No direct navigation away (modals handle onward routing)
 *
 * DEPENDENCIES:
 * - React useState for modal visibility state
 * - JoinQuizModal component for player join workflow
 * - QuizWizard component for host creation workflow
 *
 * FUTURE ENHANCEMENTS:
 * - Could add recent quiz history or featured quizzes
 * - Could display active quiz count or player statistics
 * - Could add educational content about quiz game rules
 */

// src/pages/QuizChallengePage.tsx
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import JoinQuizModal from '../components/Quiz/joinroom/JoinQuizModal';
import QuizWizard from '../components/Quiz/Wizard/QuizWizard';

const QuizChallengePage = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { connected } = useWallet();

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Quiz Challenge</h1>
        <WalletMultiButton />
      </div>

      <p className="mb-8 text-gray-700">
        Welcome to the ultimate fundraising quiz!
        {!connected && (
          <span className="block mt-2 text-sm text-indigo-600 font-medium">
            Connect your Phantom wallet to get started.
          </span>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowWizard(true)}
          disabled={!connected}
        >
          Host a Quiz
        </button>

        <button
          className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowJoinModal(true)}
          disabled={!connected}
        >
          Join a Quiz
        </button>
      </div>

      {showWizard && <QuizWizard onComplete={() => {/* navigate to dashboard */}} />}
      {showJoinModal && <JoinQuizModal onClose={() => setShowJoinModal(false)} />}
    </div>
  );
};

export default QuizChallengePage;
