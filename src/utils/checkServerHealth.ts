/**
 * Server Health Check Utility
 *
 * **Purpose:**
 * Provides a lightweight health check function to verify WebSocket server availability before
 * attempting to establish Socket.io connections. Helps provide better UX by detecting server
 * downtime early and showing appropriate error messages.
 *
 * **Use Cases:**
 * 1. Pre-flight check before joining/creating rooms
 * 2. Periodic health monitoring during active sessions
 * 3. Error diagnosis when socket connections fail
 * 4. Deployment validation (smoke tests)
 *
 * **Integration:**
 * - Called by: Room creation/join flows, connection error handlers
 * - Server endpoint: `/api/health` (simple 200 OK response)
 * - Timeout behavior: Relies on browser fetch timeout (typically 30s)
 *
 * **Return Values:**
 * - `true`: Server is reachable and healthy (200 OK response)
 * - `false`: Server is down, unreachable, or returned error status
 *
 * **Error Handling:**
 * - Network errors → Caught and logged, returns false
 * - HTTP errors (4xx/5xx) → Logged, returns false
 * - Unexpected exceptions → Caught and logged, returns false
 *
 * **Usage:**
 * ```typescript
 * import { checkServerHealth } from '@/utils/checkServerHealth';
 *
 * async function attemptConnection() {
 *   const isHealthy = await checkServerHealth();
 *   if (!isHealthy) {
 *     showError('Server is currently unavailable. Please try again later.');
 *     return;
 *   }
 *   // Proceed with socket connection...
 * }
 * ```
 *
 * **Future Enhancements:**
 * - Add timeout parameter (default 5s instead of browser default)
 * - Return detailed health info (uptime, active rooms, player count)
 * - Add retry logic with exponential backoff
 * - Support WebSocket health check (ws:// instead of http://)
 */
export async function checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { method: 'GET' });
      if (!response.ok) {
        console.error('Health check failed:', response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Server unreachable:', error);
      return false;
    }
  }
  