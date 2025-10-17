/**
 * PITCHDECK.TSX - PIN-Protected Investor Pitch Deck
 *
 * This page serves as a secure gateway to the Fundraisely investor pitch deck presentation. It
 * implements PIN-based authentication to restrict access to confidential business information,
 * ensuring only authorized viewers (investors, partners, stakeholders) can view the company's
 * pitch materials. Once authenticated, users see the full pitch deck rendered via iframe.
 *
 * ROLE IN THE APPLICATION:
 * - Provides secure access to investor pitch materials
 * - Protects confidential business information with PIN authentication
 * - Serves pitch deck content via embedded iframe after authorization
 * - Maintains authorization state across sessions using localStorage
 * - Offers clean escape route back to main site for unauthorized users
 *
 * SECURITY MODEL:
 * - Requires 5-digit PIN for access (currently hardcoded as '12345')
 * - Authorization status persisted to localStorage as 'pitchDeckAuthorized'
 * - Once authorized, user can access pitch deck until they clear browser data
 * - PIN submission clears input on incorrect attempt
 * - TODO: PIN should be moved to environment variable for production
 *
 * UI STATES:
 * 1. Unauthorized State (Default):
 *    - Centered authentication card with gradient accent
 *    - 5-digit password input field (masked characters)
 *    - Submit button (disabled until 5 characters entered)
 *    - Error message display on incorrect PIN
 *    - "Back to Home" link with home icon
 *
 * 2. Authorized State:
 *    - Full-screen iframe displaying pitch-deck.html
 *    - Calculated height to account for fixed header (calc(100vh - 64px))
 *    - 80% height iframe within container for spacing
 *    - No interactive elements (content within iframe)
 *
 * AUTHORIZATION FLOW:
 * 1. User visits /pitch-deck route
 * 2. Component checks localStorage for 'pitchDeckAuthorized' flag
 * 3. If not authorized, displays PIN entry form
 * 4. User enters 5-digit PIN
 * 5. On submit, PIN validated against hardcoded value
 * 6. If correct: sets authorized state, stores flag in localStorage
 * 7. If incorrect: shows error message, clears input
 * 8. Authorized users see pitch deck iframe immediately
 *
 * PERSISTENT AUTHORIZATION:
 * - Authorization stored in localStorage survives page refreshes
 * - Persists across browser sessions until localStorage cleared
 * - useEffect checks authorization on component mount
 * - Allows returning users to bypass PIN entry
 *
 * NAVIGATION:
 * - Accessed via: /pitch-deck route
 * - Can navigate to: / (home) via "Back to Home" link
 * - Does not redirect on successful auth (renders iframe inline)
 * - No automatic timeout or expiration of authorization
 *
 * IFRAME CONTENT:
 * - Source: /pitch-deck.html (static HTML file in public directory)
 * - Contains full investor presentation slides
 * - Rendered at 100% width, 80% height within container
 * - No border for seamless integration
 * - Title set for accessibility
 *
 * STYLING:
 * - Gradient background (indigo-50 to white) for unauthorized state
 * - Elevated card design with shadow for auth form
 * - Gradient accent bar at top of auth card (indigo to purple)
 * - Wide letter spacing on PIN input for better readability
 * - Responsive padding and container sizing
 * - Hover effects on buttons and links
 *
 * DEPENDENCIES:
 * - React useState for local component state (authorized, pin, error)
 * - React useEffect for localStorage check on mount
 * - React Router Link for navigation
 * - lucide-react Home icon for visual navigation cue
 *
 * SECURITY CONSIDERATIONS:
 * - PIN is client-side only (no server validation)
 * - PIN currently hardcoded in source (security through obscurity)
 * - localStorage can be manipulated by determined users
 * - Suitable for light protection, not high-security scenarios
 * - For production: consider server-side authentication, token-based auth, or time-limited access
 *
 * USE CASES:
 * - Sharing pitch deck with potential investors via link
 * - Providing access to partners during pitch meetings
 * - Displaying presentation to stakeholders securely
 * - Embedding in pitch materials sent via email
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export function PitchDeck() {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Check if user is already authorized (from localStorage)
  useEffect(() => {
    const isAuthorized = localStorage.getItem('pitchDeckAuthorized') === 'true';
    setAuthorized(isAuthorized);
  }, []);
  
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value);
    if (error) setError('');
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the PIN is correct (replace '12345' with your desired PIN)
    if (pin === '12345') {
      setAuthorized(true);
      localStorage.setItem('pitchDeckAuthorized', 'true');
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };
  
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-24 pb-10 px-4">
        <div className="container mx-auto max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-8">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Enter PIN to Access Pitch Deck</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="password"
                    maxLength={5}
                    placeholder="Enter 5-digit PIN"
                    value={pin}
                    onChange={handlePinChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-center text-xl tracking-widest"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-100 text-red-800 p-3 rounded-lg text-center">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={pin.length !== 5}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold
                         hover:from-indigo-700 hover:to-purple-700 transform transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
                
                <div className="text-center mt-4">
                  <Link 
                    to="/" 
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <Home className="w-4 h-4 mr-1" /> Back to Home
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render the pitch deck content when authorized
  return (
    <div className="bg-indigo-50">
      {/* Full height iframe taking into account the header */}
      <div className="pt-16" style={{ height: 'calc(100vh - 64px)' }}>
        <iframe 
          src="/pitch-deck.html" 
          style={{ 
            width: '100%',
            height: '80%',
            border: 'none'
          }}
          title="FundRaisely Pitch Deck"
        />
      </div>
    </div>
  );
}