/**
 * RATE LIMITER - In-Memory Request Throttling Utility
 *
 * PURPOSE:
 * This utility provides lightweight, in-memory rate limiting for Socket.io events
 * to prevent abuse, spam, and denial-of-service attacks. It implements a sliding
 * window algorithm to track and limit action attempts per socket connection without
 * requiring authentication or external dependencies.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Protects server resources from malicious or buggy clients
 * - Prevents room creation spam that could exhaust server memory
 * - Limits join attempts to prevent room flooding
 * - Ensures fair resource allocation across all connected clients
 * - Provides graceful degradation under attack (reject excess, not crash)
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Transparent to well-behaved clients (limits are generous)
 *   - Clients receive error events when rate limited (e.g., "Too many join attempts")
 *   - Frontend can implement backoff strategies based on rate limit errors
 *   - No frontend authentication required (uses socket ID as identifier)
 *
 * Socket Handler Integration:
 *   - socketHandler.js calls isRateLimited() before processing sensitive events
 *   - Applied to: create_room (3/min), join_room (5/30s)
 *   - Rate limiter returns boolean; handler sends error response if limited
 *   - Each action type has independent rate limit window
 *
 * Solana Program (No Direct Relationship):
 *   - Rate limiting is purely server-side coordination concern
 *   - Does NOT limit Solana transaction submissions (frontend handles that)
 *   - Protects WebSocket server, not blockchain interaction
 *   - Complements Solana's own spam protection at different layer
 *
 * KEY RESPONSIBILITIES:
 * 1. Attempt Tracking: Records timestamps of each action per socket/action pair
 * 2. Window Management: Implements sliding window algorithm (not fixed window)
 * 3. Limit Enforcement: Compares recent attempts against configurable thresholds
 * 4. Memory Cleanup: Auto-removes old attempts to prevent memory leaks
 * 5. Per-Action Granularity: Different limits for different action types
 * 6. Socket Cleanup: Clears all limits when socket disconnects (optional)
 *
 * DATA FLOW:
 * 1. socketHandler receives event (e.g., create_room)
 * 2. Calls rateLimiter.isRateLimited(socketId, 'create_room', 3, 60000)
 * 3. RateLimiter checks recent attempts in sliding 60s window
 * 4. If <3 attempts: records new attempt, returns false (allow)
 * 5. If >=3 attempts: returns true (block), handler emits error to client
 *
 * ALGORITHM: Sliding Window
 * - Stores array of timestamps per (socketId, action) key
 * - On each check: filters out timestamps older than window (e.g., 60s)
 * - Compares remaining count against limit
 * - More accurate than fixed windows (no burst at window boundaries)
 *
 * CONFIGURATION EXAMPLES (from socketHandler.js):
 * - create_room: 3 attempts per 60,000ms (1 minute)
 * - join_room: 5 attempts per 30,000ms (30 seconds)
 * - Custom: isRateLimited(socketId, action, maxAttempts, windowMs)
 *
 * MEMORY MANAGEMENT:
 * - Each attempt stores single timestamp (8 bytes)
 * - Cleanup methods: automatic (on check) + manual (cleanup() method)
 * - clear(socketId): Removes all limits for disconnected socket
 * - cleanup(maxAge): Periodic maintenance to purge all old entries
 * - Recommended: Call cleanup() every 5-10 minutes via setInterval
 *
 * SCALABILITY NOTES:
 * - In-memory only: limits reset on server restart
 * - Not shared across server instances (each server has own limits)
 * - For distributed systems: use Redis-based rate limiter
 * - Current design: suitable for single-server deployment
 * - Memory usage: O(sockets * actions * attempts_per_window)
 *
 * ROOM MANAGER INTEGRATION:
 * - RateLimiter and RoomManager are independent utilities
 * - RateLimiter runs BEFORE RoomManager in socketHandler call chain
 * - Both use in-memory storage but manage different concerns
 * - Pattern: RateLimiter (access control) -> RoomManager (state management)
 */

// server/utils/rateLimiter.js
export class RateLimiter {
  constructor() {
    this.attempts = new Map();
  }

  /**
   * Check if socket is rate limited
   * @param {string} socketId - Socket ID
   * @param {string} action - Action name
   * @param {number} maxAttempts - Max attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   */
  isRateLimited(socketId, action, maxAttempts = 5, windowMs = 60000) {
    const key = `${socketId}:${action}`;
    const now = Date.now();

    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const attempts = this.attempts.get(key);

    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    this.attempts.set(key, recentAttempts);

    // Check if rate limited
    if (recentAttempts.length >= maxAttempts) {
      return true;
    }

    // Record this attempt
    recentAttempts.push(now);
    return false;
  }

  /**
   * Clear rate limit for socket
   */
  clear(socketId) {
    const keys = Array.from(this.attempts.keys()).filter(k => k.startsWith(socketId));
    keys.forEach(k => this.attempts.delete(k));
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup(maxAge = 300000) {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      const recent = attempts.filter(t => now - t < maxAge);
      if (recent.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recent);
      }
    }
  }
}

export default RateLimiter;
