/**
 * TokenRegistrySetup - Automatic setup for token approval
 *
 * This component automatically checks if NATIVE_MINT is approved
 * and provides a simple button to set it up if needed.
 */

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  checkTokenRegistry,
  initializeTokenRegistry,
  addApprovedToken,
} from '@/lib/solana/program';

export function TokenRegistrySetup() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<'checking' | 'approved' | 'needs-setup' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);

  // Check token registry status on mount and when wallet changes
  useEffect(() => {
    checkStatus();
  }, [connection, wallet.publicKey]);

  async function checkStatus() {
    try {
      setStatus('checking');
      const result = await checkTokenRegistry(connection, NATIVE_MINT);

      if (result.isApproved) {
        setStatus('approved');
        console.log('[COMPLETE] NATIVE_MINT is approved');
      } else {
        setStatus('needs-setup');
        console.log('️ Token registry needs setup');
      }
    } catch (err: any) {
      console.error('Error checking token registry:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to check token registry');
    }
  }

  async function handleSetup() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setIsSettingUp(true);
      setErrorMsg('');
      setTxSignatures([]);

      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      console.log('[LAUNCH] Starting token registry setup...');
      console.log('Admin wallet:', wallet.publicKey.toBase58());

      // Check if already initialized
      const status = await checkTokenRegistry(connection, NATIVE_MINT);

      // Initialize if needed
      if (!status.initialized) {
        console.log('[NOTE] Initializing token registry...');
        const initResult = await initializeTokenRegistry(provider);
        console.log('[COMPLETE] Token registry initialized!');
        console.log('Transaction:', initResult.signature);
        setTxSignatures(prev => [...prev, initResult.signature]);

        // Wait a bit for confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Add NATIVE_MINT to approved tokens
      console.log('[NOTE] Adding NATIVE_MINT to approved tokens...');
      const approveResult = await addApprovedToken(provider, NATIVE_MINT);
      console.log('[COMPLETE] NATIVE_MINT approved!');
      console.log('Transaction:', approveResult.signature);
      setTxSignatures(prev => [...prev, approveResult.signature]);

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify
      await checkStatus();

      alert('[COMPLETE] Setup complete! You can now create rooms with SOL.');

    } catch (err: any) {
      console.error('[ERROR] Setup failed:', err);

      if (err.message?.includes('Unauthorized') || err.message?.includes('unauthorized')) {
        setErrorMsg('️ Your wallet is not the program admin. Only the admin can set up the token registry.');
      } else if (err.message?.includes('already in use') || err.message?.includes('AlreadyInUse')) {
        // Token registry exists, try just adding the token
        try {
          const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
          const approveResult = await addApprovedToken(provider, NATIVE_MINT);
          setTxSignatures([approveResult.signature]);
          await checkStatus();
          alert('[COMPLETE] NATIVE_MINT approved!');
        } catch (err2: any) {
          setErrorMsg(err2.message || 'Failed to approve token');
        }
      } else if (err.message?.includes('TokenAlreadyApproved')) {
        await checkStatus();
        alert('[COMPLETE] NATIVE_MINT was already approved!');
      } else {
        setErrorMsg(err.message || 'Setup failed');
      }
    } finally {
      setIsSettingUp(false);
    }
  }

  // Don't show anything if approved
  if (status === 'approved') {
    return null;
  }

  // Show warning banner if setup needed
  if (status === 'needs-setup') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg">️ Token Registry Setup Required</h3>
            <p className="text-sm">
              NATIVE_MINT (wrapped SOL) needs to be approved before you can create rooms.
              {wallet.publicKey ? ' Click the button to set it up automatically.' : ' Please connect your wallet first.'}
            </p>
          </div>
          <button
            onClick={handleSetup}
            disabled={!wallet.publicKey || isSettingUp}
            className="px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSettingUp ? '⏳ Setting up...' : ' Setup Now'}
          </button>
        </div>

        {errorMsg && (
          <div className="max-w-4xl mx-auto mt-3 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {txSignatures.length > 0 && (
          <div className="max-w-4xl mx-auto mt-3 p-3 bg-green-100 text-green-800 rounded-lg text-sm">
            <strong>Transactions:</strong>
            {txSignatures.map((sig, i) => (
              <div key={sig}>
                <a
                  href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Transaction {i + 1}: {sig.slice(0, 8)}...{sig.slice(-8)}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show loading or error state
  if (status === 'checking') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white p-2 text-center text-sm">
        Checking token registry...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-sm">
        Error checking token registry: {errorMsg}
      </div>
    );
  }

  return null;
}
