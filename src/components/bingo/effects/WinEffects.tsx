/**
 * WINEFFECTS.TSX - Animated Win Celebration Overlay Component
 *
 * This component displays an animated celebration overlay when a player wins (line or full house),
 * complete with confetti animations, trophy/heart icons, personalized messaging, and smooth entrance/
 * exit transitions. It provides immediate visual feedback to all players about win events, celebrating
 * winners while congratulating non-winners, creating a positive emotional experience for everyone.
 *
 * ROLE IN THE APPLICATION:
 * - Displays win notifications for both line and full house victories
 * - Celebrates the winner with confetti animation (canvas-confetti library)
 * - Shows personalized messages for winners vs non-winners
 * - Provides dismissible overlay with close button
 * - Animates entrance and exit smoothly with framer-motion
 * - Triggered by GameScreen when win events occur
 * - Auto-dismisses after user interaction or parent decision
 *
 * WIN TYPES:
 * 1. Line Win:
 *    - First player to complete a line (row, column, diagonal)
 *    - Game continues after line win (towards full house)
 *    - Message: "Congratulations on your line win!" or "Congratulations on their line win!"
 *
 * 2. Full House Win:
 *    - First player to mark all 25 numbers on their card
 *    - Game ends after full house win
 *    - Message: "Congratulations on your bingo victory!" or "Congratulations on their bingo victory!"
 *
 * VISUAL VARIATIONS:
 * Winner (isWinner === true):
 * - Green-teal gradient background (from-green-500 to-teal-500)
 * - Trophy icon in yellow-300
 * - Bold "You won!" heading
 * - Confetti animation from both sides of screen
 * - White text on vibrant background
 *
 * Non-Winner (isWinner === false):
 * - Soft indigo-purple gradient (from-indigo-100 to-purple-100)
 * - Heart icon in pink-500
 * - "{winnerName} won!" heading
 * - No confetti (celebration for winner only)
 * - Indigo-800 text on light background
 *
 * CONFETTI ANIMATION:
 * - Triggered only for winners (isWinner === true)
 * - Duration: 3 seconds of continuous confetti bursts
 * - Two origin points: left side (x: 0.1-0.3) and right side (x: 0.7-0.9)
 * - Bursts every 250ms (4 per second)
 * - Particle count decreases over time (taper effect)
 * - Uses canvas-confetti library for realistic physics
 * - 360-degree spread for full coverage
 * - Auto-cleans up interval on unmount
 *
 * ANIMATIONS (FRAMER-MOTION):
 * - Initial: scale 0 (invisible, collapsed)
 * - Animate: scale 1 (full size, visible)
 * - Exit: scale 0 (collapse back)
 * - Smooth spring physics for natural feel
 * - Wrapped in AnimatePresence in parent for exit animation
 *
 * COMPONENT STRUCTURE:
 * ```
 * <motion.div> (animated container)
 *   ├─ Icon (Trophy for winner, Heart for non-winner)
 *   ├─ <div> Text content
 *   │   ├─ <h3> Win heading
 *   │   └─ <p> Congratulations message
 *   └─ <button> Close button (X icon, top-right corner)
 * ```
 *
 * STATE MANAGEMENT:
 * - showEffect: Local boolean to control visibility
 * - Initially true, set to false on close
 * - When false, renders null (component hidden)
 * - Parent controls overall visibility via props
 *
 * PROPS INTERFACE:
 * - isWinner: boolean - Is the current player the winner?
 * - winnerName: string - Name of the winning player
 * - playerName: string - Current player's name (for comparison)
 * - winNotificationType: 'line' | 'fullHouse' - Type of win
 * - onClose: () => void - Callback when user closes notification
 *
 * USER INTERACTIONS:
 * - Close Button: X icon in top-right corner
 *   - Click triggers: setShowEffect(false) + onClose() callback
 *   - Hover effect: bg-black/10 background
 *   - Opacity increases on hover for visibility
 *
 * RESPONSIVE DESIGN:
 * - Full-width layout with padding (p-6)
 * - Margin bottom (mb-8) for spacing from content below
 * - Icon sizes scale appropriately (36px Trophy, 32px Heart)
 * - Text sizes responsive (text-2xl, text-xl)
 * - Close button always accessible (absolute positioning)
 *
 * ACCESSIBILITY:
 * - Close button has title="Close" for screen readers
 * - type="button" prevents form submission
 * - Clear visual distinction between winner/non-winner states
 * - Icons provide visual reinforcement
 * - Color contrast meets WCAG guidelines (white on green/teal, dark on light)
 *
 * STYLING DETAILS:
 * - Rounded corners: rounded-xl (0.75rem)
 * - Shadow: shadow-lg for elevation
 * - Gradients: Linear from left to right
 * - Padding: Comfortable spacing (p-6)
 * - Gap: Flexbox gap-4 between icon and text
 *
 * INTEGRATION:
 * - Rendered by GameScreen component
 * - Wrapped in AnimatePresence for exit animations
 * - Controlled by showWinNotification flag in parent
 * - Triggered when server broadcasts win events
 * - Parent determines when to show/hide
 *
 * PERFORMANCE NOTES:
 * - Confetti interval cleaned up on unmount
 * - useEffect dependency on isWinner (runs once per win)
 * - Component unmounts when showEffect false (no memory leak)
 * - Canvas-confetti uses requestAnimationFrame (60fps)
 *
 * CONFETTI CONFIGURATION:
 * - startVelocity: 30 (launch speed)
 * - spread: 360 (omnidirectional)
 * - ticks: 60 (particle lifetime)
 * - zIndex: 0 (below modals but above content)
 * - particleCount: Decreases from 50 to 0 over 3 seconds
 * - origin: Random position between 10-30% and 70-90% horizontally
 *
 * USAGE EXAMPLE:
 * ```tsx
 * <AnimatePresence>
 *   {showWinNotification && (
 *     <WinEffects
 *       isWinner={isWinner}
 *       winnerName={winnerName}
 *       playerName={playerName}
 *       winNotificationType={winNotificationType}
 *       onClose={() => setShowWinNotification(false)}
 *     />
 *   )}
 * </AnimatePresence>
 * ```
 *
 * EMOTIONAL DESIGN:
 * - Winners feel celebrated (confetti, trophy, vibrant colors)
 * - Non-winners feel included (heart icon, congratulatory message)
 * - Positive reinforcement for all players
 * - Creates memorable moments in gameplay
 * - Enhances overall user experience
 *
 * DEPENDENCIES:
 * - React useState, useEffect for state and lifecycle
 * - canvas-confetti for particle effects
 * - framer-motion for animations
 * - lucide-react for icons (Trophy, Heart, X)
 *
 * FUTURE ENHANCEMENTS:
 * - Add sound effects for wins
 * - Customize confetti colors based on win type
 * - Add winner's Bingo card display
 * - Show prize amount in notification
 * - Add social sharing buttons
 * - Display winner's statistics (games played, win rate)
 * - Add replay animation button
 */

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Trophy, Heart, X } from 'lucide-react';

interface WinEffectsProps {
  isWinner: boolean;
  winnerName: string;
  playerName: string;
  winNotificationType: 'line' | 'fullHouse';
  onClose?: () => void;
}

export function WinEffects({
  isWinner,
  winnerName,
  playerName,
  winNotificationType,
  onClose,
}: WinEffectsProps) {
  const [showEffect, setShowEffect] = useState(true);

  useEffect(() => {
    if (isWinner) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isWinner]);

  if (!showEffect) return null;

  const isLine = winNotificationType === 'line';
  const isYou = winnerName === playerName;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={`relative flex items-center justify-center gap-4 mb-8 p-6 rounded-xl shadow-lg ${
        isWinner
          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
          : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800'
      }`}
    >
      {isWinner ? (
        <>
          <Trophy size={36} className="text-yellow-300" />
          <div>
            <h3 className="text-2xl font-bold">You won!</h3>
            <p className="text-white/80">
              {isLine ? 'Congratulations on your line win!' : 'Congratulations on your bingo victory!'}
            </p>
          </div>
        </>
      ) : (
        <>
          <Heart size={32} className="text-pink-500" />
          <div>
            <h3 className="text-xl font-medium">{winnerName} won!</h3>
            <p className="text-indigo-600">
              {isLine ? 'Congratulations on their line win!' : 'Congratulations on their bingo victory!'}
            </p>
          </div>
        </>
      )}
      <button
        type="button"
        title="Close"
        onClick={() => {
          setShowEffect(false);
          onClose?.();
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
      >
        <X size={16} className="opacity-75 hover:opacity-100" />
      </button>
    </motion.div>
  );
}
