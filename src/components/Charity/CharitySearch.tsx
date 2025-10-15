import { useState } from 'react';

interface Charity {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  categories: string[];
}

interface CharitySearchProps {
  onSelect: (charity: Charity, address: string) => void;
  selectedCharity?: Charity | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export function CharitySearch({ onSelect, selectedCharity }: CharitySearchProps) {
  const [query, setQuery] = useState('');
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCharities = async () => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/charities?q=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }

      const data = await res.json();
      setCharities(data);

      if (data.length === 0) {
        setError('No charities found. Try a different search term.');
      }
    } catch (err) {
      console.error('Failed to search charities:', err);
      setError('Failed to search charities. Is the backend running?');
      setCharities([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCharity = async (charity: Charity) => {
    setLoadingAddress(true);
    setError(null);

    try {
      // Get Solana address for this charity
      const res = await fetch(
        `${BACKEND_URL}/api/charities/${charity.id}/address/SOL`
      );

      if (!res.ok) {
        throw new Error(`Failed to get charity address: ${res.statusText}`);
      }

      const data = await res.json();

      // Pass charity and address back to parent
      onSelect(charity, data.address);
    } catch (err) {
      console.error('Failed to get charity address:', err);
      setError('Failed to get charity Solana address');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      searchCharities();
    }
  };

  return (
    <div className="charity-search">
      <div className="space-y-4">
        {/* Search Box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search charities (e.g., 'Red Cross')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || loadingAddress}
          />
          <button
            onClick={searchCharities}
            disabled={loading || loadingAddress || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Selected Charity Display */}
        {selectedCharity && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900">
              ✓ Selected: {selectedCharity.name}
            </h4>
            {loadingAddress && (
              <p className="text-sm text-green-700 mt-1">
                Loading Solana address...
              </p>
            )}
          </div>
        )}

        {/* Search Results */}
        {!selectedCharity && charities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Found {charities.length} {charities.length === 1 ? 'charity' : 'charities'}
            </p>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {charities.map((charity) => (
                <div
                  key={charity.id}
                  onClick={() => selectCharity(charity)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    {charity.logo_url && (
                      <img
                        src={charity.logo_url}
                        alt={charity.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {charity.name}
                      </h4>
                      {charity.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {charity.description}
                        </p>
                      )}
                      {charity.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {charity.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedCharity && charities.length === 0 && !loading && !error && query && (
          <div className="text-center py-8 text-gray-500">
            <p>Search for charities to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
