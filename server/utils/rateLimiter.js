// server/utils/rateLimiter.js

/**
 * Simple in-memory rate limiter
 */
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
