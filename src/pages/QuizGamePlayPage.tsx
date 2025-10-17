/**
 * QUIZGAMEPLAYPAGE.TSX - Active Quiz Gameplay Page
 *
 * This is the main gameplay interface for quiz participants, displayed during active quiz rounds.
 * It handles real-time question delivery, answer submission, clue requests, countdown timers, and
 * immediate feedback for each question. This component orchestrates the entire player experience
 * during a live quiz session through WebSocket-based event handling.
 *
 * ROLE IN THE APPLICATION:
 * - Primary gameplay interface for quiz players during active rounds
 * - Real-time synchronization with quiz host and other players via WebSocket
 * - Manages question display, answer selection, timer countdown, and feedback
 * - Handles automatic answer submission when time expires
 * - Coordinates with server for clue requests (lifelines)
 * - Displays round transitions and quiz completion messages
 *
 * GAMEPLAY FLOW:
 * 1. Player lands here when host starts quiz from QuizGameWaitingPage
 * 2. Receives 'question' event with question text, options, and time limit
 * 3. Timer starts counting down from configured time limit
 * 4. Player selects answer (multiple choice buttons or text input)
 * 5. Player can optionally request a clue (uses lifeline)
 * 6. Player submits answer or timer auto-submits at 0
 * 7. Receives 'answer_reveal' event with correct answer and feedback
 * 8. Displays feedback (Correct/Incorrect) to player
 * 9. Receives 'round_end' event and shows waiting message
 * 10. Process repeats for each round until 'quiz_end' event
 *
 * SOCKET EVENT HANDLING:
 * - 'question': New question received, resets UI and starts timer
 * - 'clue_revealed': Displays hint to help player answer
 * - 'answer_reveal': Shows correct answer and player's result
 * - 'round_end': Question completed, waiting for next round
 * - 'next_round_starting': Round transition notification
 * - 'quiz_end': Quiz completed with final message
 * - 'submit_survivor_answer': Emitted when player submits answer
 * - 'use_clue': Emitted when player requests clue/lifeline
 *
 * STATE MANAGEMENT:
 * - question: Current question object (text, options, timeLimit)
 * - timeLeft: Countdown timer in seconds
 * - timerActive: Boolean controlling countdown
 * - selectedAnswer: Player's current answer selection
 * - clue: Optional hint text revealed on request
 * - feedback: "Correct!" or "Incorrect." message after submission
 * - phaseMessage: Status messages between rounds
 *
 * TIMER LOGIC:
 * - Starts when question received with configured time limit (default 30s)
 * - Counts down every second via setTimeout
 * - Automatically submits answer when reaching 0
 * - Stops when answer submitted manually or time expires
 * - Stops when answer reveal received from server
 *
 * UI MODES:
 * 1. Active Question Mode:
 *    - Question text prominently displayed
 *    - Answer options (buttons) or text input
 *    - Optional clue display if requested
 *    - Submit button and "Use Clue" button
 *    - Countdown timer display
 *    - Feedback display after submission
 *
 * 2. Waiting Mode:
 *    - Gray box with phase message
 *    - "Waiting for host to start the quiz..."
 *    - "Round X complete. Waiting for next round..."
 *    - Quiz end message with final results
 *
 * QUESTION TYPES SUPPORTED:
 * - Multiple Choice: question.options array provided → rendered as buttons
 * - Open Text: question.options is null/undefined → rendered as text input
 *
 * ROUTE PARAMETERS:
 * - roomId: Quiz room identifier (from URL)
 * - playerId: Unique player identifier (from URL)
 * - Required for all socket emissions and tracking
 *
 * NAVIGATION:
 * - Accessed via: /quiz/play/:roomId/:playerId
 * - Navigated from: QuizGameWaitingPage (when host starts quiz)
 * - Does not navigate away (quiz ends on this page)
 *
 * DEBUG MODE:
 * - debug constant enables console logging of all events
 * - socket.onAny() logs every socket event for troubleshooting
 * - Useful for development and debugging gameplay issues
 *
 * DEPENDENCIES:
 * - React useState for local component state
 * - React useEffect for socket listeners and timer logic
 * - React Router useParams for URL parameters
 * - useQuizSocket custom hook for WebSocket connection
 *
 * ERROR HANDLING:
 * - Guards against missing socket, roomId, or playerId
 * - Handles edge cases in timer countdown (null safety)
 * - Prevents submission of empty answers
 * - Cleans up socket listeners on unmount
 *
 * FUTURE ENHANCEMENTS:
 * - Add visual progress bar for timer
 * - Show player rankings/scores during quiz
 * - Add sound effects for correct/incorrect answers
 * - Display other players' answer status (answered/not answered)
 * - Add confetti animation for correct answers
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../components/Quiz/useQuizSocket';

const debug = true;

const QuizGamePlayPage = () => {
  const { roomId, playerId } = useParams();
  const socket = useQuizSocket();

  const [question, setQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phaseMessage, setPhaseMessage] = useState<string>('Waiting for host to start the quiz...');

  // [COMPLETE] Rejoin room on reconnect
useEffect(() => {
  if (!socket || !roomId || !playerId) return;

  if (debug) console.log('[Client]  Joining quiz room on mount:', roomId);

  socket.emit('join_quiz_room', {
    roomId,
    player: {
      id: playerId,
      name: 'Player ' + playerId, // replace if needed
    },
  });
}, [socket, roomId, playerId]);


  // [COMPLETE] Game event listeners
  useEffect(() => {
    if (!socket || !roomId || !playerId) return;

    socket.on('question', (data) => {
      if (debug) console.log('[Client]  Received question:', data);
      setQuestion(data);
      setSelectedAnswer('');
      setClue(null);
      setFeedback(null);
      setTimeLeft(data.timeLimit || 30);
      setTimerActive(true);
      setPhaseMessage('');
    });

    socket.on('clue_revealed', ({ clue }) => {
      if (debug) console.log('[Client] [IDEA] Clue revealed:', clue);
      setClue(clue);
    });

    socket.on('answer_reveal', ({ correctAnswer, playerResult }) => {
      if (debug) console.log('[Client] [COMPLETE] Answer reveal:', correctAnswer, playerResult);
      setFeedback(playerResult?.correct ? '[COMPLETE] Correct!' : '[ERROR] Incorrect.');
      setTimerActive(false);
    });

    socket.on('round_end', ({ round }) => {
      if (debug) console.log(`[Client] ⏹️ Round ${round} ended`);
      setPhaseMessage(`Round ${round} complete. Waiting for next round...`);
      setQuestion(null);
      setTimerActive(false);
    });

    socket.on('next_round_starting', ({ round }) => {
      if (debug) console.log(`[Client]  Starting Round ${round}`);
      setPhaseMessage(`Starting Round ${round}...`);
    });

    socket.on('quiz_end', ({ message }) => {
      if (debug) console.log(`[Client] [FINISH] Quiz ended: ${message}`);
      setPhaseMessage(message);
      setQuestion(null);
      setTimerActive(false);
    });

    return () => {
      socket.off('question');
      socket.off('clue_revealed');
      socket.off('answer_reveal');
      socket.off('round_end');
      socket.off('next_round_starting');
      socket.off('quiz_end');
    };
  }, [socket, roomId, playerId]);

  // [COMPLETE] Timer countdown logic
  useEffect(() => {
    if (!timerActive || timeLeft === null) return;

    if (timeLeft <= 0) {
      setTimerActive(false);
      handleSubmit(); // auto-submit
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  const handleSubmit = () => {
    if (!selectedAnswer || !question || !socket) return;
    if (debug) console.log('[Client]  Submitting answer:', selectedAnswer);

    socket.emit('submit_survivor_answer', {
      roomId,
      playerId,
      answer: selectedAnswer
    });
  };

  const handleClueRequest = () => {
    if (!socket) return;
    if (debug) console.log('[Client]  Requesting clue...');
    socket.emit('use_clue', { roomId, playerId });
  };

useEffect(() => {
  if (!socket) return;

  const logAnyEvent = (event: string, ...args: any[]) => {
    console.log(`[Client]  Received event: ${event}`, args);
  };

  socket.onAny(logAnyEvent);

  return () => {
    socket.offAny(logAnyEvent);
  };
}, [socket]);



  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">[GAME] Quiz In Progress</h1>
      <p className="text-sm text-gray-500 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-500 mb-4">Player ID: {playerId}</p>

      {question ? (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-indigo-700">{question.text}</h2>
            {clue && <p className="text-sm text-blue-500 mt-1">[IDEA] Clue: {clue}</p>}
          </div>

          {question.options ? (
            <div className="space-y-2">
              {question.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(opt)}
                  className={`block w-full text-left px-4 py-2 rounded-lg border ${
                    selectedAnswer === opt
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Type your answer"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleClueRequest}
              className="text-blue-600 text-sm underline"
            >
              [SEARCH] Use Clue
            </button>

            <button
              onClick={handleSubmit}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition"
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </div>

          {feedback && (
            <div className="mt-4 text-lg font-medium text-center text-gray-800">
              {feedback}
            </div>
          )}

          {timerActive && (
            <div className="text-sm text-gray-500 text-right">⏳ Time left: {timeLeft}s</div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 p-6 rounded-xl text-center text-gray-600">
          {phaseMessage}
        </div>
      )}
    </div>
  );
};

export default QuizGamePlayPage;




