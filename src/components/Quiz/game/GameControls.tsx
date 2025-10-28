/**
 * Host Game Controls - Quiz Execution Command Center
 *
 * **Purpose:** Real-time quiz control panel for hosts to run the live quiz. Manages question
 * progression, round transitions, timer display, and quiz termination. Coordinates with server
 * via WebSocket to synchronize all players.
 *
 * **Key Features:**
 * 1. **Question Control**: Advance to next question, timer countdown
 * 2. **Round Management**: Start next round, track progress
 * 3. **Player Tracking**: Live player count display
 * 4. **Phase Indicators**: Visual status (waiting/in_question/reviewing/complete)
 * 5. **Quiz Termination**: End quiz and trigger prize distribution
 *
 * **Game Flow:**
 * ```
 * Host clicks "Next Question"
 *   ↓
 * socket.emit('start_next_question', { roomId })
 *   ↓
 * Server generates question → Emits 'question' event to all
 *   ↓
 * Host receives 'question' → Display question + start timer
 *   ↓
 * Players see question on their screens
 *   ↓
 * Timer counts down (host & players see countdown)
 *   ↓
 * Time expires → Host reveals answer (manual or auto)
 *   ↓
 * If last question of round → "Start Next Round" button enabled
 *   ↓
 * Host clicks "Start Next Round"
 *   ↓
 * Repeat for next round...
 *   ↓
 * After final round → Host clicks "End Quiz"
 *   ↓
 * Server calculates winners → Prize distribution
 * ```
 *
 * **Socket Events:** emit 'start_next_question', 'start_next_round', 'end_quiz'
 * **Socket Events Received:** 'room_config', 'question', 'quiz_end', 'player_joined'
 *
 * **Phase Lifecycle:** 'waiting' → 'in_question' → 'reviewing' → 'complete'
 *
 * **Integration:**
 * - Parent: HostDashboard (5th panel)
 * - WebSocket: useQuizSocket
 * - Related: Player game screens (receive same events)
 *
 * @component
 * @category Quiz Dashboard
 */

//src/quiz/game/GameControls.tsx

import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuizSocket } from '../useQuizSocket';
import { usePlayerStore } from '../../../stores/quizPlayerStore';

const debug = true;

const HostGameControls = () => {
  const { roomId } = useParams();
  const socket = useQuizSocket();
  const { players } = usePlayerStore();

  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [status, setStatus] = useState('Waiting to begin');
  const [canStartNextQuestion, setCanStartNextQuestion] = useState(true);
  const [canStartNextRound, setCanStartNextRound] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'in_question' | 'reviewing' | 'complete'>('waiting');

  const questionCounterRef = useRef(0);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Request room configuration on component mount
    socket.emit('request_room_config', { roomId });

    socket.on('room_config', ({ totalRounds, questionsPerRound }) => {
      if (debug) console.log('[Host] [TOOLS] Received room config:', { totalRounds, questionsPerRound });
      setTotalRounds(totalRounds);
      setQuestionsPerRound(questionsPerRound);
    });

    socket.on('player_joined', () => {
      setTotalPlayers(prev => prev + 1);
    });

    socket.on('player_list_updated', ({ players }) => {
      if (Array.isArray(players)) {
        setTotalPlayers(players.length);
        if (debug) console.log('[Host]  Updated player list:', players);
      }
    });

    socket.on('question', (data) => {
      if (debug) console.log('[Host]  Received question event:', data);
      setCurrentQuestion(data);
      questionCounterRef.current += 1;
      setQuestion(questionCounterRef.current);
      setTimeLeft(data.timeLimit || 30);
      setPhase('in_question');
      setStatus(' Question sent');

      // Check if this is the last question in the round
      if (questionCounterRef.current >= questionsPerRound) {
        setCanStartNextQuestion(false);
        setCanStartNextRound(true);
        setPhase('reviewing');
        setStatus('[COMPLETE] Round complete. Awaiting answer reveal.');
      }
    });

    socket.on('next_round_starting', ({ round }) => {
      if (debug) console.log('[Host]  Round', round, 'starting');
      setRound(round);
      questionCounterRef.current = 0;
      setQuestion(0);
      setCanStartNextQuestion(true);
      setCanStartNextRound(false);
      setCurrentQuestion(null);
      setPhase('waiting');
      setStatus(` Round ${round} started`);
    });

    socket.on('quiz_end', ({ message }) => {
      setStatus(`[FINISH] ${message}`);
      setQuizEnded(true);
      setPhase('complete');
      setCanStartNextQuestion(false);
      setCanStartNextRound(false);
    });

    socket.on('round_limit_reached', ({ round }) => {
      if (debug) console.log(`[Host]  Max questions reached for round ${round}`);
      setCanStartNextQuestion(false);
      setCanStartNextRound(true);
      setPhase('reviewing');
      setStatus(`[COMPLETE] Round ${round} complete. Please reveal answers before next round.`);
    });

    socket.on('round_end', ({ round }) => {
      if (debug) console.log(`[Host] [FINISH] Round ${round} ended`);
      setCanStartNextQuestion(false);
      setCanStartNextRound(true);
      setPhase('reviewing');
      setStatus(`[COMPLETE] Round ${round} complete. Ready for next round.`);
    });

    return () => {
      socket.off('room_config');
      socket.off('player_joined');
      socket.off('player_list_updated');
      socket.off('question');
      socket.off('next_round_starting');
      socket.off('quiz_end');
      socket.off('round_limit_reached');
      socket.off('round_end');
    };
  }, [socket, roomId, questionsPerRound]);

  useEffect(() => {
  if (!socket || !roomId) return;

  //  Host joins room as "player" to receive events
  socket.emit('join_quiz_room', {
    roomId,
    player: {
      id: 'host_' + socket.id,
      name: 'Host',
      isHost: true
    }
  });

  if (debug) console.log('[Host]  Joined quiz room:', roomId);
}, [socket, roomId]);


  // Timer effect for question countdown
  useEffect(() => {
    if (!timeLeft || phase !== 'in_question') return;
    if (timeLeft <= 0) {
      setStatus(`⏱️ Time's up for question ${question}`);
      return;
    }

    const timer = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase, question]);

  const handleNextQuestion = () => {
    if (!socket || !roomId || !canStartNextQuestion || quizEnded) return;
    if (debug) console.log('[Host] ▶️ Emitting start_next_question', { roomId });

    socket.emit('start_next_question', { roomId });
  };

  const handleNextRound = () => {
    if (!socket || !roomId || !canStartNextRound || quizEnded) return;
    if (debug) console.log('[Host]  Emitting start_next_round', { roomId });

    socket.emit('start_next_round', { roomId });
  };

  const handleStartQuiz = () => {
    if (!socket || !roomId) return;

    const allReady = players.every(p => p.isReady || p.isHost);
    if (!allReady) {
      alert('Not all players are ready! Please wait for all players to click "Ready Up".');
      return;
    }

    if (debug) console.log('[Host] Starting quiz', { roomId });
    socket.emit('quiz_started', { roomId });
    setQuizStarted(true);
    setStatus('Quiz started! Click "Next Question" to begin.');
  };

  const handleEndQuiz = () => {
    if (!socket || !roomId) return;
    if (debug) console.log('[Host] [ERROR] Emitting end_quiz', { roomId });

    socket.emit('end_quiz', { roomId });
    setQuizEnded(true);
    setPhase('complete');
    setCanStartNextQuestion(false);
    setCanStartNextRound(false);
  };

  const phaseColor = {
    waiting: 'bg-gray-400',
    in_question: 'bg-green-500',
    reviewing: 'bg-yellow-500',
    complete: 'bg-red-600'
  }[phase];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4"> Host Game Controls</h1>
      <p className="text-sm text-gray-500 mb-4">Room ID: {roomId}</p>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="text-sm text-gray-700 space-y-1">
          <p> Round: {round} / {totalRounds}</p>
          <p> Question: {question} / {questionsPerRound}</p>
          <p> Total Players: {totalPlayers}</p>
          {!quizStarted && (
            <p className="flex items-center gap-2">
              Ready Status:
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                players.every(p => p.isReady || p.isHost)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {players.filter(p => p.isReady || p.isHost).length} / {players.length} Ready
              </span>
            </p>
          )}
          <p className="flex items-center gap-2">
             Phase: <span className={`text-white text-xs font-semibold px-2 py-1 rounded ${phaseColor}`}>{phase.replace('_', ' ').toUpperCase()}</span>
          </p>
          <p className="mt-2 font-medium"> Status: {status}</p>
          {timeLeft !== null && phase === 'in_question' && (
            <p className={`text-sm font-semibold ${timeLeft <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
              ⏳ Time left: {timeLeft}s
            </p>
          )}
        </div>

        {currentQuestion && (
          <div className="bg-gray-100 p-4 rounded-xl">
            <p className="text-sm font-semibold text-gray-700"> Current Question Preview:</p>
            <p className="text-base text-indigo-700 mt-1">{currentQuestion.text}</p>
            {Array.isArray(currentQuestion.options) && (
              <ul className="mt-2 list-disc list-inside text-sm text-gray-800">
                {currentQuestion.options.map((opt: string, idx: number) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mt-4">
          {!quizStarted && (
            <button
              onClick={handleStartQuiz}
              className="px-4 py-2 rounded-xl w-full transition text-white font-semibold shadow bg-green-600 hover:bg-green-700"
            >
              Start Quiz
            </button>
          )}

          {quizStarted && (
            <button
              onClick={handleNextQuestion}
              className={`px-4 py-2 rounded-xl w-full transition text-white font-semibold shadow ${
                canStartNextQuestion
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!canStartNextQuestion || quizEnded}
            >
              ▶️ Next Question
            </button>
          )}

          <button
            onClick={handleNextRound}
            className={`px-4 py-2 rounded-xl w-full transition text-white font-semibold shadow ${
              canStartNextRound 
                ? 'bg-yellow-500 hover:bg-yellow-600' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!canStartNextRound || quizEnded}
          >
             Start Next Round
          </button>

          <button
            onClick={handleEndQuiz}
            className="bg-red-600 text-white px-4 py-2 rounded-xl w-full hover:bg-red-700 transition font-semibold shadow"
            disabled={quizEnded}
          >
            [ERROR] End Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostGameControls;







