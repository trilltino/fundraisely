// components/quiz/wizard/StepPaymentMethod.tsx
import { useState, type FC, type FormEvent } from 'react';
import { Wallet, CreditCard, AlertCircle, Info } from 'lucide-react';
import { useQuizConfig } from '../useQuizConfig';
import type { WizardStepProps } from './WizardStepProps';
import type { SupportedChain } from '../../../hooks/useQuizChainIntegration';

const StepPaymentMethod: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const [paymentMethod, setPaymentMethod] = useState<'cash_or_revolut' | 'web3' | ''>(
    config.paymentMethod || ''
  );
  const [entryFee, setEntryFee] = useState(config.entryFee || '');
  const [currencySymbol, setCurrencySymbol] = useState(config.currencySymbol || '€');

  // Web3 blockchain configuration
  const [web3Chain, setWeb3Chain] = useState<SupportedChain>(
    (config.web3Chain as SupportedChain) || 'solana'
  );
  const [solanaCluster, setSolanaCluster] = useState<'devnet' | 'mainnet' | 'testnet'>(
    config.solanaCluster || 'devnet'
  );
  const [web3Currency, setWeb3Currency] = useState<'USDC' | 'SOL'>(
    (config.web3Currency as 'USDC' | 'SOL') || 'USDC'
  );
  const [charityAddress, setCharityAddress] = useState(config.web3CharityAddress || '');
  const [charityName, setCharityName] = useState(config.charityName || '');
  const [hostFeePct, setHostFeePct] = useState(config.hostFeeBps ? config.hostFeeBps / 100 : 0);
  const [prizePoolPct, setPrizePoolPct] = useState(config.prizePoolBps ? config.prizePoolBps / 100 : 35);

  const [error, setError] = useState('');

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar' },
    { symbol: '£', label: 'British Pound (GBP)' },
    { symbol: '₹', label: 'Indian Rupee (INR)' },
    { symbol: '¥', label: 'Japanese Yen (JPY)' },];

  // Calculate charity percentage (platform 20%, remaining split between host/prize/charity)
  const platformPct = 20;
  const charityPct = 100 - platformPct - hostFeePct - prizePoolPct;

  // Validate Solana address format (base58, 32-44 characters)
  const isValidSolanaAddress = (addr: string): boolean => {
    if (!addr || addr.length < 32 || addr.length > 44) return false;
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(addr);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = entryFee.trim();
    const parsed = Number.parseFloat(trimmed);

    if (!paymentMethod) {
      setError('Please choose a payment method.');
      return;
    }

    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid entry fee greater than 0.');
      return;
    }

    // Web3-specific validation
    if (paymentMethod === 'web3') {
      if (!charityName.trim()) {
        setError('Please enter a charity name.');
        return;
      }

      if (web3Chain === 'solana' && !isValidSolanaAddress(charityAddress)) {
        setError('Please enter a valid Solana wallet address (32-44 base58 characters).');
        return;
      }

      if (charityPct < 40) {
        setError('Charity allocation must be at least 40%. Reduce host fee or prize pool percentage.');
        return;
      }
    }

    const currencyToStore = paymentMethod === 'web3' ? web3Currency : currencySymbol;

    setError('');
    const updateData: any = {
      entryFee: trimmed,
      paymentMethod,
      currencySymbol: currencyToStore,
    };

    // Add web3-specific fields if web3 payment method is selected
    if (paymentMethod === 'web3') {
      updateData.web3Chain = web3Chain;
      updateData.web3ChainConfirmed = web3Chain;
      updateData.solanaCluster = solanaCluster;
      updateData.web3Currency = web3Currency;
      updateData.web3CharityAddress = charityAddress;
      updateData.charityName = charityName;
      updateData.hostFeeBps = Math.round(hostFeePct * 100);
      updateData.prizePoolBps = Math.round(prizePoolPct * 100);
      updateData.charityBps = Math.round(charityPct * 100);
    }

    updateConfig(updateData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 3 of 7: Entry Fee & Payment Method</h2>

      <div className="grid gap-4">
        <label
          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
            paymentMethod === 'cash_or_revolut'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-400'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="cash_or_revolut"
            checked={paymentMethod === 'cash_or_revolut'}
            onChange={() => setPaymentMethod('cash_or_revolut')}
            className="hidden"
          />
          <CreditCard className="h-6 w-6 text-indigo-600" />
          <div>
            <p className="font-medium text-gray-800">Cash or Debit (Revolut)</p>
            <p className="text-sm text-gray-600">You will handle or verify payment manually.</p>
          </div>
        </label>

        <label
          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
            paymentMethod === 'web3'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-400'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="web3"
            checked={paymentMethod === 'web3'}
            onChange={() => setPaymentMethod('web3')}
            className="hidden"
          />
          <Wallet className="h-6 w-6 text-indigo-600" />
          <div>
            <p className="font-medium text-gray-800">Web3 Wallet (USDC)</p>
            <p className="text-sm text-gray-600">Players will pay with crypto via connected wallet.</p>
          </div>
        </label>
      </div>

      {paymentMethod === 'cash_or_revolut' && (
        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium text-gray-700">
            Choose Currency
          </label>
          <select
            id="currency"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500"
          >
            {currencyOptions.map((opt) => (
              <option key={opt.symbol} value={opt.symbol}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {paymentMethod === 'web3' && (
        <div className="space-y-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
          <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Blockchain Configuration
          </h3>

          {/* Chain Selection */}
          <div className="space-y-2">
            <label htmlFor="web3Chain" className="text-sm font-medium text-gray-700">
              Blockchain Network
            </label>
            <select
              id="web3Chain"
              value={web3Chain}
              onChange={(e) => setWeb3Chain(e.target.value as SupportedChain)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white"
            >
              <option value="solana">Solana</option>
              <option value="evm" disabled>EVM (Coming Soon)</option>
              <option value="stellar" disabled>Stellar (Coming Soon)</option>
            </select>
          </div>

          {/* Solana-specific configuration */}
          {web3Chain === 'solana' && (
            <>
              <div className="space-y-2">
                <label htmlFor="solanaCluster" className="text-sm font-medium text-gray-700">
                  Solana Network
                </label>
                <select
                  id="solanaCluster"
                  value={solanaCluster}
                  onChange={(e) => setSolanaCluster(e.target.value as 'devnet' | 'mainnet' | 'testnet')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white"
                >
                  <option value="devnet">Devnet (Testing)</option>
                  <option value="mainnet">Mainnet (Production)</option>
                  <option value="testnet">Testnet</option>
                </select>
                <p className="text-xs text-gray-600 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Use Devnet for testing with free tokens. Switch to Mainnet for production.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="web3Currency" className="text-sm font-medium text-gray-700">
                  Payment Token
                </label>
                <select
                  id="web3Currency"
                  value={web3Currency}
                  onChange={(e) => setWeb3Currency(e.target.value as 'USDC' | 'SOL')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white"
                >
                  <option value="USDC">USDC (Stablecoin)</option>
                  <option value="SOL">SOL (Native)</option>
                </select>
              </div>
            </>
          )}

          {/* Charity Configuration */}
          <div className="space-y-4 pt-4 border-t-2 border-indigo-200">
            <h4 className="text-sm font-semibold text-indigo-900">Charity Details</h4>

            <div className="space-y-2">
              <label htmlFor="charityName" className="text-sm font-medium text-gray-700">
                Charity Name
              </label>
              <input
                id="charityName"
                type="text"
                value={charityName}
                onChange={(e) => setCharityName(e.target.value)}
                placeholder="e.g., Red Cross"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="charityAddress" className="text-sm font-medium text-gray-700">
                Charity Wallet Address
              </label>
              <input
                id="charityAddress"
                type="text"
                value={charityAddress}
                onChange={(e) => setCharityAddress(e.target.value)}
                placeholder={web3Chain === 'solana' ? 'Solana wallet address (base58)' : 'Wallet address'}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 bg-white font-mono text-sm"
              />
              <p className="text-xs text-gray-600 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {web3Chain === 'solana'
                  ? 'Enter a valid Solana wallet address (32-44 characters, base58 encoded)'
                  : 'Enter the wallet address where charity funds should be sent'}
              </p>
            </div>
          </div>

          {/* Fee Structure */}
          <div className="space-y-4 pt-4 border-t-2 border-indigo-200">
            <h4 className="text-sm font-semibold text-indigo-900">Fee Structure</h4>

            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="hostFee" className="text-sm font-medium text-gray-700 flex justify-between">
                  <span>Host Fee</span>
                  <span className="text-indigo-600 font-semibold">{hostFeePct.toFixed(1)}%</span>
                </label>
                <input
                  id="hostFee"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={hostFeePct}
                  onChange={(e) => setHostFeePct(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">Fee retained by quiz host (0-5%)</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="prizePool" className="text-sm font-medium text-gray-700 flex justify-between">
                  <span>Prize Pool</span>
                  <span className="text-indigo-600 font-semibold">{prizePoolPct.toFixed(1)}%</span>
                </label>
                <input
                  id="prizePool"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={prizePoolPct}
                  onChange={(e) => setPrizePoolPct(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">Total prize pool for winners (0-40%)</p>
              </div>

              {/* Fee Breakdown Summary */}
              <div className="bg-white rounded-lg p-4 space-y-2 border-2 border-indigo-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Fee Breakdown</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">{platformPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Host Fee</span>
                    <span className="font-medium">{hostFeePct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prize Pool</span>
                    <span className="font-medium">{prizePoolPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-indigo-100">
                    <span className={`font-semibold ${charityPct >= 40 ? 'text-green-700' : 'text-red-700'}`}>
                      Charity Allocation
                    </span>
                    <span className={`font-bold ${charityPct >= 40 ? 'text-green-700' : 'text-red-700'}`}>
                      {charityPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {charityPct < 40 && (
                  <p className="text-xs text-red-600 flex items-start gap-1 pt-2">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Charity must receive at least 40% of entry fees
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentMethod && (
        <div className="space-y-2">
          <label htmlFor="entryFee" className="text-sm font-medium text-gray-700">
            Entry Fee ({paymentMethod === 'web3' ? web3Currency : currencySymbol})
          </label>
          <input
            id="entryFee"
            type="number"
            min="0"
            step="0.01"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            placeholder="e.g., 5"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-5 rounded-xl transition"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-xl transition"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default StepPaymentMethod;


