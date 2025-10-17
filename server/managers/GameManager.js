/**
 * GAME MANAGER - Bingo Game Logic
 *
 * Handles the actual Bingo game mechanics:
 * - Number calling (manual and auto-play)
 * - Game state tracking
 * - Winner verification
 */

export class GameManager {
  constructor() {
    this.games = new Map(); // Map<roomId, GameState>
  }

  /**
   * Initialize a new game for a room
   */
  initializeGame(roomId) {
    const gameState = {
      roomId,
      calledNumbers: [],
      currentNumber: null,
      autoPlay: false,
      autoPlayInterval: null,
      availableNumbers: this.generateAvailableNumbers(),
      isPaused: false,
      lineWinners: [],
      fullHouseWinners: [],
      startedAt: Date.now(),
    };

    this.games.set(roomId, gameState);
    console.log(` Game initialized for room ${roomId}`);
    return gameState;
  }

  /**
   * Generate array of numbers 1-75 for Bingo
   */
  generateAvailableNumbers() {
    return Array.from({ length: 75 }, (_, i) => i + 1);
  }

  /**
   * Get game state for a room
   */
  getGame(roomId) {
    return this.games.get(roomId) || null;
  }

  /**
   * Call a random number
   */
  callNumber(roomId) {
    const game = this.games.get(roomId);
    if (!game) {
      throw new Error(`Game ${roomId} not found`);
    }

    if (game.isPaused) {
      throw new Error('Game is paused');
    }

    if (game.availableNumbers.length === 0) {
      throw new Error('All numbers have been called');
    }

    // Pick random number from available numbers
    const randomIndex = Math.floor(Math.random() * game.availableNumbers.length);
    const number = game.availableNumbers[randomIndex];

    // Remove from available
    game.availableNumbers.splice(randomIndex, 1);

    // Add to called
    game.calledNumbers.push(number);
    game.currentNumber = number;

    console.log(` Number called in room ${roomId}: ${number} (${game.calledNumbers.length}/75)`);

    return {
      currentNumber: number,
      calledNumbers: game.calledNumbers,
    };
  }

  /**
   * Toggle auto-play for a room
   */
  toggleAutoPlay(roomId, io) {
    const game = this.games.get(roomId);
    if (!game) {
      throw new Error(`Game ${roomId} not found`);
    }

    game.autoPlay = !game.autoPlay;

    if (game.autoPlay) {
      // Start auto-calling numbers every 3 seconds
      game.autoPlayInterval = setInterval(() => {
        try {
          if (game.isPaused || game.availableNumbers.length === 0) {
            return;
          }

          const result = this.callNumber(roomId);
          io.to(roomId).emit('number_called', result);
        } catch (error) {
          console.error(`Auto-play error in room ${roomId}:`, error);
          this.stopAutoPlay(roomId);
        }
      }, 3000); // 3 seconds between numbers

      console.log(`▶️  Auto-play started for room ${roomId}`);
    } else {
      this.stopAutoPlay(roomId);
      console.log(`⏸️  Auto-play stopped for room ${roomId}`);
    }

    return game.autoPlay;
  }

  /**
   * Stop auto-play for a room
   */
  stopAutoPlay(roomId) {
    const game = this.games.get(roomId);
    if (game && game.autoPlayInterval) {
      clearInterval(game.autoPlayInterval);
      game.autoPlayInterval = null;
      game.autoPlay = false;
    }
  }

  /**
   * Pause game (stops auto-play temporarily)
   */
  pauseGame(roomId) {
    const game = this.games.get(roomId);
    if (!game) {
      throw new Error(`Game ${roomId} not found`);
    }

    game.isPaused = true;
    console.log(`⏸️  Game paused in room ${roomId}`);
    return game;
  }

  /**
   * Unpause game (resumes auto-play if it was on)
   */
  unpauseGame(roomId) {
    const game = this.games.get(roomId);
    if (!game) {
      throw new Error(`Game ${roomId} not found`);
    }

    game.isPaused = false;
    console.log(`▶️  Game unpaused in room ${roomId}`);
    return game;
  }

  /**
   * End game and cleanup
   */
  endGame(roomId) {
    const game = this.games.get(roomId);
    if (game) {
      this.stopAutoPlay(roomId);
      this.games.delete(roomId);
      console.log(`[FINISH] Game ended for room ${roomId}`);
    }
  }

  /**
   * Clean up all games for a room
   */
  cleanup(roomId) {
    this.endGame(roomId);
  }
}

export default GameManager;
