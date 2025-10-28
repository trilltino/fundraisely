/**
 * Join Quiz Web2 Page - Pre-Registered Player Entry Point
 *
 * **Purpose:** Dedicated page for players joining via QR code/link with pre-assigned playerId.
 * Used when host manually adds players in PlayerListPanel (Web2 rooms). Verifies both room
 * existence and player approval before allowing join.
 *
 * **Route:**
 * - URL: `/join/:roomId?playerId={playerId}`
 * - Example: `/join/abc123?playerId=xyz789`
 * - Accessed from: QR codes generated in PlayerListPanel
 *
 * **Join Flow:**
 * ```
 * Player scans QR code or clicks link
 *   ↓
 * Navigate to /join/{roomId}?playerId={playerId}
 *   ↓
 * verifyRoomAndPlayer(socket, roomId, playerId)
 *   ↓
 * Server checks:
 *   - Room exists? ✓
 *   - Player in room.players array? ✓
 *   ↓
 * joinQuizRoom(socket, roomId, player)
 *   ↓
 * Save playerId to localStorage for reconnection
 *   ↓
 * Wait 1 second (ensure socket join completes)
 *   ↓
 * Navigate to /quiz/game/{roomId}/{playerId}
 * ```
 *
 * **Verification Logic:**
 * `verifyRoomAndPlayer()` helper emits socket event:
 * ```typescript
 * socket.emit('verify_room_and_player', { roomId, playerId });
 * socket.once('verification_result', (data) => {
 *   // data: { roomExists: boolean, playerApproved: boolean }
 * });
 * ```
 *
 * **Player Approval:**
 * Player is "approved" if they exist in `room.players` array on server.
 * This happens when:
 * - Host manually added player in PlayerListPanel
 * - Player previously joined and disconnected
 * - Player paid entry fee (Web3 blockchain join)
 *
 * **Error Handling:**
 * - **Room not found**: Alert "Room does not exist." → User stuck on page
 * - **Player not approved**: Alert "You are not approved to join this room." → User stuck on page
 * - **Socket disconnected**: Console warn "[ERROR] Socket not connected." → User stuck on page
 *
 * **Why 1-Second Delay Before Redirect:**
 * ```typescript
 * setTimeout(() => { navigate(`/quiz/game/${roomId}/${playerId}`); }, 1000);
 * ```
 *
 * **Reason:** Socket.io `join_quiz_room` event must complete before navigating to game page.
 * Otherwise game page loads before player is added to room, causing missing player errors.
 *
 * **localStorage Persistence:**
 * ```typescript
 * localStorage.setItem(`quiz_rejoin_${roomId}`, playerId);
 * ```
 *
 * **Why Different Key Than JoinQuizModal:**
 * - JoinQuizModal uses: `quizPlayerId:{roomId}`
 * - JoinQuizWeb2Page uses: `quiz_rejoin_{roomId}`
 * - Both serve same purpose (reconnection), inconsistent naming is legacy artifact
 *
 * **Player Name Fallback:**
 * ```typescript
 * const player = { id: playerId, name: `Player ${playerId}` };
 * ```
 *
 * **Issue:** Player name should come from server verification response, not fallback.
 * This hardcoded name may display incorrectly in game UI if server doesn't override.
 *
 * **vs. JoinQuizModal:**
 *
 * **JoinQuizWeb2Page:**
 * - Player already registered by host
 * - PlayerId known from URL query param
 * - Verification: Room exists + Player approved
 * - No name entry (host already set name)
 *
 * **JoinQuizModal:**
 * - Player self-registers
 * - PlayerId generated on join
 * - Verification: Room exists only
 * - Player enters name manually
 *
 * **Integration:**
 * - Parent: None (root route component)
 * - Accessed from: PlayerListPanel QR codes
 * - WebSocket: useQuizSocket → `verify_room_and_player`, `join_quiz_room`
 * - Helpers: `joinQuizSocket.ts` (utility functions for socket events)
 * - Navigation: `/quiz/game/{roomId}/{playerId}`
 *
 * **UI:**
 * Simple loading screen showing:
 * - "Joining Room..."
 * - Room ID
 * - Player ID
 * No interactivity (automatic join process)
 *
 * **Future Enhancements:**
 * - Error recovery UI (don't just alert, show actionable error page)
 * - Loading animation during verification
 * - Fetch and display actual player name from verification response
 * - Consistent localStorage key naming
 * - Remove setTimeout hack (use socket event confirmation instead)
 *
 * @component
 * @category Quiz Join Flow
 */

import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../useQuizSocket';
import { joinQuizRoom, verifyRoomAndPlayer } from '../joinQuizSocket';

const JoinQuizWeb2Page = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('playerId');
  const socket = useQuizSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket || !roomId || !playerId) return;

    console.log('[JoinQuiz] Verifying room & player...');
    verifyRoomAndPlayer(socket, roomId, playerId, (data) => {
      console.log('[JoinQuiz] Verification result:', data);

      if (!data.roomExists) {
        alert('Room does not exist.');
        return;
      }

      if (!data.playerApproved) {
        alert('You are not approved to join this room.');
        return;
      }

      const player = { id: playerId, name: `Player ${playerId}` };

      if (socket.connected) {
        console.log('[COMPLETE] Socket connected. Joining room...');
        joinQuizRoom(socket, roomId, player);
      } else {
        console.warn('[ERROR] Socket not connected. Cannot join room.');
        return;
      }

      localStorage.setItem(`quiz_rejoin_${roomId}`, playerId);

      // ⏳ Delay redirect so join_quiz_room finishes
      setTimeout(() => {
        console.log('️ Navigating to /quiz/game...');
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 1000);
    });
  }, [socket, roomId, playerId]);

  return (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Joining Room...</h1>
      <p className="text-sm text-gray-500">Room ID: {roomId}</p>
      <p className="text-sm text-gray-500">Player ID: {playerId}</p>
    </div>
  );
};

export default JoinQuizWeb2Page;


