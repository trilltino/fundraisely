/**
 * PITCHDECKCONTENT.TSX - Alternative Pitch Deck Viewer with Navigation Controls
 *
 * This is an alternative implementation of the pitch deck viewer that provides manual slide
 * navigation controls (Previous/Next buttons) and a slide counter. Unlike PitchDeck.tsx which
 * requires PIN authentication, this component focuses purely on presentation controls and can
 * be used in contexts where authentication is handled elsewhere or not required.
 *
 * ROLE IN THE APPLICATION:
 * - Alternative pitch deck presentation interface with navigation controls
 * - Displays the same pitch-deck.html content as PitchDeck.tsx
 * - Provides explicit slide navigation buttons and progress indicator
 * - Offers full-screen presentation mode without headers
 * - Can be used for public presentations or when authentication isn't needed
 *
 * KEY DIFFERENCES FROM PITCHDECK.TSX:
 * - No PIN authentication (content immediately visible)
 * - Includes Previous/Next navigation buttons
 * - Shows slide counter (X / 12)
 * - Full-screen layout (h-screen) without header spacing
 * - Manual slide tracking via React state
 * - Different route (/pitch-deck-content vs /pitch-deck)
 *
 * UI LAYOUT:
 * 1. Main Content Area (flex-grow):
 *    - Full-height iframe displaying pitch-deck.html
 *    - No border for seamless presentation
 *    - Fills all available vertical space
 *
 * 2. Control Bar (bottom, fixed height):
 *    - Centered horizontally
 *    - Previous button (disabled on first slide)
 *    - Slide counter display (currentSlide + 1 / totalSlides)
 *    - Next button (disabled on last slide)
 *    - Indigo styling matching app theme
 *
 * SLIDE NAVIGATION:
 * - Total slides: 12 (hardcoded constant)
 * - currentSlide state: 0-indexed (0 to 11)
 * - Display: 1-indexed (1 to 12) for user-friendliness
 * - Previous button: decrements currentSlide if > 0
 * - Next button: increments currentSlide if < totalSlides - 1
 * - Buttons disabled at boundaries to prevent invalid navigation
 *
 * STATE MANAGEMENT:
 * - currentSlide: Tracks which slide user is viewing (0-based index)
 * - totalSlides: Constant set to 12 matching pitch deck content
 * - State persists during component lifecycle
 * - State resets if component unmounts and remounts
 *
 * IFRAME INTEGRATION:
 * - Source: /pitch-deck.html (same as PitchDeck.tsx)
 * - Full width and height within container
 * - No synchronization between React state and iframe content
 * - NOTE: currentSlide state is tracked but not actively used to control iframe
 * - TODO: Implement actual slide navigation in iframe or remove state tracking
 *
 * CURRENT LIMITATION:
 * The component tracks currentSlide state and provides navigation buttons, but the iframe
 * content (/pitch-deck.html) is not actually controlled by these buttons. The slide counter
 * and navigation are cosmetic. For full functionality, the iframe would need:
 * - Postmessage communication to control slides
 * - Or replace iframe with slide components in React
 * - Or use a presentation library that exposes slide control API
 *
 * NAVIGATION:
 * - Accessed via: /pitch-deck-content route
 * - Header hidden on this route (see App.tsx showHeader logic)
 * - No authentication gate or redirects
 * - No navigation links within component (full-screen experience)
 *
 * STYLING:
 * - Full viewport height (h-screen)
 * - Flexbox column layout for content + controls
 * - Content area grows to fill space (flex-grow)
 * - Control bar fixed height with padding
 * - Indigo-600 button background
 * - Disabled state styling (opacity-50, cursor-not-allowed)
 * - Consistent spacing with space-x-4
 *
 * USE CASES:
 * - Public pitch deck viewing without authentication
 * - Presentation mode with explicit controls
 * - Embedding in contexts where slide tracking is useful
 * - Alternative to PitchDeck.tsx when PIN protection not needed
 *
 * DEPENDENCIES:
 * - React useState for slide tracking
 *
 * RECOMMENDATIONS:
 * - Consider consolidating with PitchDeck.tsx (one component with optional auth)
 * - Implement actual iframe slide control or remove navigation state
 * - Add keyboard shortcuts (arrow keys) for slide navigation
 * - Add fullscreen API integration for presentations
 * - Sync currentSlide with actual iframe slide position if possible
 */

import { useState } from 'react';

export function PitchDeckContent() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 12;
  
  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  // The pitch deck content is embedded as an HTML file
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-grow relative">
        <iframe 
          src="/pitch-deck.html" 
          className="w-full h-full border-0" 
          title="FundRaisely Pitch Deck"
       />
      </div>
      
      <div className="p-4 flex justify-center space-x-4">
        <button 
         type="button"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex items-center">
          <span className="text-gray-700">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
        <button 
         type="button"
          onClick={handleNext}
          disabled={currentSlide === totalSlides - 1}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}