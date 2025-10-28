/**
 * Game Access Alert - Animated Error Notification
 *
 * **Purpose:** Displays error messages when players fail game access validation (wrong room ID,
 * game already started, etc.). Uses Framer Motion for smooth slide-in animation from top of screen.
 *
 * **Props:**
 * - `message`: Error message to display to user
 * - `onClose`: Callback when user dismisses alert
 *
 * **Styling:**
 * - Red theme (bg-red-100, text-red-800, border-red-200) for error emphasis
 * - Fixed positioning at top center of screen
 * - AlertCircle icon for visual error indicator
 * - Close button for user dismissal
 *
 * **Animation:**
 * - Initial: Opacity 0, Y offset -50px (above screen)
 * - Animate: Opacity 1, Y offset 0 (slide down and fade in)
 * - Exit: Opacity 0, Y offset -50px (slide up and fade out)
 *
 * **Usage Example:**
 * ```tsx
 * {showAlert && (
 *   <GameAccessAlert
 *     message="Room not found. Please check your room ID."
 *     onClose={() => setShowAlert(false)}
 *   />
 * )}
 * ```
 *
 * **Common Error Messages:**
 * - "Room not found. Please check your room ID."
 * - "Game has already started. You cannot join."
 * - "This room is full. Maximum players reached."
 * - "You are not authorized to access this game."
 *
 * @component
 * @category Bingo Components
 */

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface GameAccessAlertProps {
  message: string;
  onClose: () => void;
}

export function GameAccessAlert({ message, onClose }: GameAccessAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-6 py-4 bg-red-100 text-red-800 rounded-xl shadow-lg border border-red-200">
        <AlertCircle className="w-5 h-5" />
        <p className="font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-4 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}