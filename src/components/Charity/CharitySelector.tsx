/**
 * Charity Selector Component
 *
 * Integrates with The Giving Block (TGB) API via backend proxy to search for
 * and select charities for fundraising rooms. Fetches charity metadata including
 * name, description, logo, and categories. Resolves Solana donation addresses
 * for selected charities through the TGB backend service.
 *
 * Features:
 * - Search charities by name
 * - Display charity cards with logo and metadata
 * - Fetch Solana wallet addresses from TGB
 * - Error handling for charities without Solana support
 * - Loading states and user feedback
 */

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface Charity {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  categories: string[];
}

interface CharitySelectorProps {
  onSelect: (charityWallet: PublicKey, charityName: string) => void;
  selectedCharity?: string;
}

export function CharitySelector({ onSelect, selectedCharity }: CharitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCharities = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_TGB_BACKEND_URL}/api/charities?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch charities');
      }

      const data = await response.json();
      setCharities(data);
    } catch (err) {
      setError((err as Error).message);
      setCharities([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCharity = async (charity: Charity) => {
    setLoading(true);
    setError(null);

    try {
      // Get Solana donation address for this charity
      const response = await fetch(
        `${import.meta.env.VITE_TGB_BACKEND_URL}/api/charities/${charity.id}/address/sol`
      );

      if (!response.ok) {
        throw new Error('This charity does not accept Solana donations');
      }

      const data = await response.json();
      const charityWallet = new PublicKey(data.address);

      onSelect(charityWallet, charity.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-white font-semibold mb-2">Select Charity</label>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCharities()}
          className="flex-1 px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
          placeholder="Search for a charity..."
        />
        <button
          onClick={searchCharities}
          disabled={loading || !searchQuery.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {selectedCharity && (
        <div className="p-4 mb-4 bg-green-500/20 border border-green-500 rounded-lg text-green-200">
          <strong>Selected:</strong> {selectedCharity}
        </div>
      )}

      {loading && !charities.length && (
        <div className="text-center py-8 text-gray-400">
          Loading charities...
        </div>
      )}

      {!loading && charities.length > 0 && (
        <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
          {charities.map((charity) => (
            <button
              key={charity.id}
              onClick={() => selectCharity(charity)}
              disabled={loading}
              className="text-left p-4 bg-white/10 hover:bg-white/20 rounded-lg border border-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                {charity.logo_url && (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{charity.name}</h3>
                  {charity.description && (
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">{charity.description}</p>
                  )}
                  {charity.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {charity.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-1 bg-purple-600/30 text-purple-200 text-xs rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && charities.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-400">
          No charities found. Try a different search term.
        </div>
      )}
    </div>
  );
}
