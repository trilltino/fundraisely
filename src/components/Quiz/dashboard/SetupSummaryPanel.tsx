/**
 * Setup Summary Panel - Quiz Configuration Display
 *
 * **Purpose:** Sub-panel of HostDashboard displaying complete quiz configuration in readable
 * format. Shows all wizard selections (host name, game type, timing, prizes, fundraising, etc.)
 * for host verification before quiz starts.
 *
 * **Key Features:**
 * 1. **Complete Config Display**: All wizard steps summarized in one view
 * 2. **Join Link Sharing**: Clickable link for easy distribution
 * 3. **Conditional Rendering**: Only shows configured fields (hides empty values)
 * 4. **Prize Breakdown**: Different display formats for split/assets/cash prizes
 * 5. **Fundraising Summary**: Lists enabled extras with pricing
 *
 * **Displayed Fields:**
 * - **Host Name**: Display name of quiz creator
 * - **Game Type**: Quiz template (pub_quiz, speed_round, etc.)
 * - **Team Based**: Yes/No indicator for team gameplay
 * - **Rounds**: Number of rounds configured
 * - **Time per Question**: Seconds allowed per answer
 * - **Questions per Round**: Question count per round
 * - **Multimedia Enabled**: Whether media (images/audio) used
 * - **Entry Fee**: Cost to join (or "Free")
 * - **Payment Method**: "Web3 Wallet" or "Cash or Revolut"
 * - **Start Time**: Scheduled start (localized datetime)
 * - **Room ID**: Unique room identifier
 * - **Join Link**: Clickable `/join/{roomId}` URL
 * - **Fundraising Extras**: List of enabled extras with prices
 * - **Prize Setup**: Breakdown of prize distribution
 *
 * **Prize Display Formats:**
 *
 * **Split Mode (Web3):**
 * ```
 * Prize Setup:
 *   • 1st place — 60%
 *   • 2nd place — 30%
 *   • 3rd place — 10%
 * ```
 *
 * **Assets Mode (Web3, future):**
 * ```
 * Prize Setup:
 *   • 1st place — NFT Trophy (€500, sponsored by Acme Corp)
 *   • 2nd place — Gift Card (€200)
 * ```
 *
 * **Cash Mode (Web2):**
 * ```
 * Prize Setup:
 *   • 1st place — Cash Prize (€100)
 *   • 2nd place — Gift Voucher (€50)
 * ```
 *
 * **Fundraising Extras Display:**
 * Transforms camelCase keys to Title Case with pricing:
 * ```
 * Fundraising Extras: Buy Hint (€1.50), Extra Time (€0.75), Skip Question (€2.00)
 * ```
 *
 * **Transformation Logic:**
 * ```typescript
 * 'buyHint' → 'Buy Hint'
 * 'extraTime' → 'Extra Time'
 * key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
 * ```
 *
 * **Join Link Component:**
 * ```tsx
 * <Link to={`/join/${roomId}`} className="text-indigo-600 hover:underline">
 *   /join/{roomId}
 * </Link>
 * ```
 *
 * **Why React Router Link:**
 * - Client-side navigation (no page reload)
 * - Accessible (supports keyboard navigation)
 * - Styled as hyperlink (indigo color, underline on hover)
 *
 * **Conditional Rendering:**
 * Fields only shown if they have values:
 * - `{startTime && <div>...</div>}` - Only show if scheduled
 * - `{roomId && <div>...</div>}` - Only show if room created
 * - `{entryFee || 'Free'}` - Show "Free" if no fee set
 *
 * **Grid Layout:**
 * Responsive 2-column grid:
 * - Mobile: 1 column (stacked)
 * - Desktop: 2 columns (side-by-side)
 * - Full-width: Fundraising extras, prizes, join link (sm:col-span-2)
 *
 * **Start Time Formatting:**
 * ```typescript
 * new Date(startTime).toLocaleString()
 * // "12/25/2025, 7:00:00 PM" (user's local timezone)
 * ```
 *
 * **Data Source:**
 * All data from `useQuizConfig.config` (Zustand store populated by wizard).
 *
 * **Null Safety:**
 * ```typescript
 * if (!config) return null;
 * ```
 * If no config loaded (should never happen in HostDashboard), render nothing.
 *
 * **Integration:**
 * - Parent: HostDashboard (first panel)
 * - State: useQuizConfig (read-only, no updates)
 * - Navigation: React Router Link for join URL
 * - Related: All wizard steps (data comes from StepHostInfo, StepGameType, etc.)
 *
 * **Use Cases:**
 * - **Pre-flight check**: Host verifies all settings before starting quiz
 * - **Join link sharing**: Copy/share room link with participants
 * - **Reference during quiz**: Quick lookup of config (time limits, prizes, etc.)
 * - **Troubleshooting**: Verify config if quiz behaving unexpectedly
 *
 * **Future Enhancements:**
 * - "Edit Config" button (return to wizard to modify settings)
 * - "Copy Join Link" button (one-click clipboard copy)
 * - QR code display for join link (mobile scanning)
 * - Export config as JSON (backup/sharing)
 * - Print-friendly format (physical handout for in-person events)
 *
 * @component
 * @category Quiz Dashboard
 */

import React from 'react';
import { useQuizConfig } from '../useQuizConfig';
import { Link } from 'react-router-dom';

const SetupSummaryPanel: React.FC = () => {
  const { config } = useQuizConfig();

  if (!config) return null;

  const {
    hostName,
    gameType,
    teamBased,
    roundCount,
    timePerQuestion,
    useMedia,
    entryFee,
    paymentMethod,
    fundraisingOptions,
    fundraisingPrices,
    questionsPerRound,
    startTime,
    roomId,
    prizeMode,
    prizeSplits,
    prizes,
  } = config;

  const activeFundraising = fundraisingOptions
    ? Object.entries(fundraisingOptions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) =>
          key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
        )
    : [];

  return (
    <div className="bg-white p-8 rounded-xl shadow-md space-y-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-6"> Quiz Setup Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-600">
        <div><strong>Host Name:</strong> {hostName || '—'}</div>
        <div><strong>Game Type:</strong> {gameType || '—'}</div>
        <div><strong>Team Based:</strong> {teamBased ? 'Yes' : 'No'}</div>
        <div><strong>Rounds:</strong> {roundCount ?? '—'}</div>
        <div><strong>Time per Question:</strong> {timePerQuestion ? `${timePerQuestion}s` : '—'}</div>
        <div><strong>Questions per Round:</strong> {questionsPerRound ?? '—'}</div>
        <div><strong>Multimedia Enabled:</strong> {useMedia ? 'Yes' : 'No'}</div>
        <div><strong>Entry Fee:</strong> {entryFee || 'Free'}</div>
        <div><strong>Payment Method:</strong> {paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash or Revolut'}</div>
        {startTime && (
          <div><strong>Start Time:</strong> {new Date(startTime).toLocaleString()}</div>
        )}
        {roomId && (
          <div className="sm:col-span-2">
            <strong>Room ID:</strong> {roomId}
            <br />
            <strong>Join Link:</strong>{' '}
            <Link
              to={`/join/${roomId}`}
              className="text-indigo-600 hover:underline"
            >
              /join/{roomId}
            </Link>
          </div>
        )}
        <div className="sm:col-span-2">
          <strong>Fundraising Extras:</strong>{' '}
          {activeFundraising.length > 0
            ? activeFundraising.map((key) => {
                const price = fundraisingPrices?.[key.toLowerCase().replace(/ /g, '')] ?? '';
                return `${key}${price ? ` (€${price})` : ''}`;
              }).join(', ')
            : 'None selected'}
        </div>

        <div className="sm:col-span-2">
          <strong>Prize Setup:</strong>{' '}
          {prizeMode === 'split' && prizeSplits ? (
            <ul className="list-disc list-inside text-gray-700">
              {Object.entries(prizeSplits).map(([place, percent]) => (
                <li key={place}>
                  {place} place — {percent}%
                </li>
              ))}
            </ul>
          ) : prizeMode === 'assets' && prizes ? (
            <ul className="list-disc list-inside text-gray-700">
              {prizes.map((prize, idx) => (
                <li key={idx}>
                  {prize.place} place — {prize.description} ({prize.value ? `€${prize.value}` : 'no value'}{prize.sponsor ? `, sponsored by ${prize.sponsor}` : ''})
                </li>
              ))}
            </ul>
          ) : prizeMode === 'cash' && prizes ? (
            <ul className="list-disc list-inside text-gray-700">
              {prizes.map((prize, idx) => (
                <li key={idx}>
                  {prize.place} place — {prize.description} ({prize.value ? `€${prize.value}` : 'no value'}{prize.sponsor ? `, sponsored by ${prize.sponsor}` : ''})
                </li>
              ))}
            </ul>
          ) : (
            'None configured'
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupSummaryPanel;

