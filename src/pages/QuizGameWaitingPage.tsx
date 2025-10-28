/**
 * QUIZGAMEWAITINGPAGE.TSX - Quiz Pre-Game Lobby
 *
 * This is the waiting room page where quiz players land after successfully joining a quiz room
 * but before the host starts the game. It serves as a holding area that provides feedback to
 * players that they've successfully joined, displays the room code for reference, and automatically
 * transitions to the active gameplay page when the host initiates the quiz.
 *
 * ROLE IN THE APPLICATION:
 * - Intermediate page between joining a quiz and playing it
 * - Confirms successful room join to the player
 * - Displays room information (room ID) for player reference
 * - Listens for quiz start signal from host via WebSocket
 * - Automatically navigates to gameplay page when quiz begins
 * - Prevents duplicate join attempts via localStorage tracking
 *
 * PLAYER EXPERIENCE FLOW:
 * 1. Player joins quiz from QuizChallengePage or direct link
 * 2. Successfully joins room and lands on this waiting page
 * 3. Sees confirmation message: "You're in!"
 * 4. Waits while host prepares and other players join
 * 5. When host clicks "Start Quiz", receives 'quiz_started' event
 * 6. Automatically redirected to QuizGamePlayPage for active gameplay
 *
 * SOCKET INTEGRATION:
 * - Uses useQuizSocket hook to maintain WebSocket connection
 * - Joins quiz room via joinQuizRoom helper function
 * - Listens for 'quiz_started' event from server
 * - Cleans up socket listeners on component unmount
 * - Handles reconnection scenarios via localStorage tracking
 *
 * REJOIN PREVENTION:
 * To prevent duplicate player entries when page refreshes or users navigate back:
 * - Stores playerId in localStorage with room-specific key: quiz_rejoin_{roomId}
 * - Checks if current playerId matches stored value
 * - Only emits join event if player hasn't already joined
 * - This ensures players don't create duplicate entries in the player list
 *
 * ROUTE PARAMETERS:
 * - roomId: Unique identifier for the quiz room (from URL params)
 * - playerId: Unique identifier for this player (from URL params)
 * - Both required for proper room joining and event handling
 *
 * NAVIGATION:
 * - Accessed via: /quiz/game/:roomId/:playerId
 * - Navigates to: /quiz/play/:roomId/:playerId (when quiz starts)
 * - Players land here from JoinQuizModal after successful join
 *
 * UI DESIGN:
 * - Simple centered layout with minimal distractions
 * - Clear success messaging to reassure player
 * - Displays room ID for player reference and troubleshooting
 * - No interactive elements (passive waiting state)
 *
 * DEPENDENCIES:
 * - React Router for navigation and URL params
 * - useQuizSocket custom hook for WebSocket connection
 * - joinQuizRoom helper for room join logic
 * - localStorage for rejoin prevention
 *
 * ERROR HANDLING:
 * - Guards against missing socket, roomId, or playerId
 * - Gracefully handles socket disconnections (hook manages reconnection)
 * - TODO: Could add error state for failed joins or timeouts
 */

// src/pages/QuizGameWaitingPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../components/Quiz/useQuizSocket';
import { joinQuizRoom } from '../components/Quiz/joinQuizSocket';

const QuizGameWaitingPage = () => {
  const { roomId, playerId } = useParams();
  const socket = useQuizSocket();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!socket || !roomId || !playerId) return;

    const localKey = `quiz_rejoin_${roomId}`;
    const storedPlayerId = localStorage.getItem(localKey);
    const alreadyJoined = storedPlayerId === playerId;

    const player = {
      id: playerId,
      name: `Player ${playerId}`, // Replace with actual name if available
    };

    if (!alreadyJoined) {
      console.log('[QuizGameWaitingPage]  Rejoining player...');
      joinQuizRoom(socket, roomId, player);
      localStorage.setItem(localKey, playerId);
    } else {
      console.log('[QuizGameWaitingPage] [COMPLETE] Already joined, no rejoin emit');
    }

    socket.on('quiz_started', () => {
      console.log('[QuizGameWaitingPage] [LAUNCH] Quiz started!');
      navigate(`/quiz/play/${roomId}/${playerId}`);
    });

    return () => {
      socket.off('quiz_started');
    };
  }, [socket, roomId, playerId]);

  const handleToggleReady = () => {
    if (!socket || !roomId) return;

    socket.emit('toggle_ready_quiz', { roomId, playerId });
    setIsReady(!isReady);
  };

  return (
    <div className="p-10 text-center max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">You're in!</h1>
      <p className="text-lg mb-6">Waiting for host to start the quiz...</p>
      <p className="text-sm mb-8 text-gray-600">Room ID: {roomId}</p>

      <div className="mb-6">
        <button
          onClick={handleToggleReady}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
            isReady
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
          }`}
        >
          {isReady ? 'Cancel Ready' : 'Ready Up!'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {isReady
          ? 'You are ready! The quiz will start when all players are ready.'
          : 'Click "Ready Up!" when you\'re prepared to play.'}
      </p>
    </div>
  );
};

export default QuizGameWaitingPage;

