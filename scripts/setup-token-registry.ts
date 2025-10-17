/**
 * Setup Token Registry - Initialize and approve NATIVE_MINT (wSOL)
 *
 * This script must be run by the program admin to:
 * 1. Initialize the token registry (one-time)
 * 2. Add NATIVE_MINT to the approved tokens list
 *
 * Usage: npx tsx scripts/setup-token-registry.ts
 */

import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  checkTokenRegistry,
  initializeTokenRegistry,
  addApprovedToken,
} from '../src/lib/solana/program';

async function main() {
  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  console.log('\n🔍 Checking token registry status...\n');

  // Check current status
  const status = await checkTokenRegistry(connection, NATIVE_MINT);

  console.log('Token Registry PDA:', status.tokenRegistryPDA.toBase58());
  console.log('Initialized:', status.initialized);
  console.log('Approved Tokens:', status.approvedTokens.length);
  console.log('NATIVE_MINT approved:', status.isApproved);
  console.log('NATIVE_MINT address:', NATIVE_MINT.toBase58());

  if (status.isApproved) {
    console.log('\n✅ NATIVE_MINT is already approved! No action needed.\n');
    return;
  }

  console.log('\n⚠️  NATIVE_MINT is not approved yet. Setup required.\n');
  console.log('This script requires:');
  console.log('  1. A connected wallet (Phantom, etc.)');
  console.log('  2. The wallet must be the program admin');
  console.log('  3. The wallet must have SOL on devnet for transaction fees\n');

  // Check if we have a wallet provider
  if (typeof window === 'undefined' || !window.solana?.isConnected) {
    console.log('❌ No wallet detected or not connected.');
    console.log('\nTo setup the token registry, please:');
    console.log('  1. Open the browser console on your dApp');
    console.log('  2. Run this script from the browser console\n');
    console.log('Or manually call these functions:');
    console.log('  1. initializeTokenRegistry(provider) - if not initialized');
    console.log('  2. addApprovedToken(provider, NATIVE_MINT)\n');
    return;
  }

  try {
    // Create provider from browser wallet
    const provider = new AnchorProvider(
      connection,
      window.solana,
      { commitment: 'confirmed' }
    );

    console.log('Connected wallet:', provider.wallet.publicKey.toBase58());

    // Initialize if needed
    if (!status.initialized) {
      console.log('\n📝 Initializing token registry...');
      const initResult = await initializeTokenRegistry(provider);
      console.log('✅ Token registry initialized!');
      console.log('   Transaction:', initResult.signature);
      console.log('   View on Solana Explorer:');
      console.log(`   https://explorer.solana.com/tx/${initResult.signature}?cluster=devnet\n`);
    }

    // Add NATIVE_MINT
    console.log('📝 Adding NATIVE_MINT to approved tokens...');
    const approveResult = await addApprovedToken(provider, NATIVE_MINT);
    console.log('✅ NATIVE_MINT approved!');
    console.log('   Transaction:', approveResult.signature);
    console.log('   View on Solana Explorer:');
    console.log(`   https://explorer.solana.com/tx/${approveResult.signature}?cluster=devnet\n`);

    // Verify
    const newStatus = await checkTokenRegistry(connection, NATIVE_MINT);
    console.log('✅ Verification complete!');
    console.log('   NATIVE_MINT approved:', newStatus.isApproved);
    console.log('   Total approved tokens:', newStatus.approvedTokens.length);
    console.log('\n🎉 Token registry setup complete! You can now create rooms with SOL.\n');

  } catch (error: any) {
    console.error('\n❌ Error during setup:', error.message);

    if (error.message?.includes('Unauthorized')) {
      console.log('\n⚠️  Your wallet is not the program admin.');
      console.log('Only the admin can initialize the token registry and approve tokens.\n');
    } else if (error.message?.includes('already in use')) {
      console.log('\n⚠️  Token registry already exists. Trying to add token only...\n');

      // Try just adding the token
      try {
        const provider = new AnchorProvider(
          connection,
          window.solana,
          { commitment: 'confirmed' }
        );
        const approveResult = await addApprovedToken(provider, NATIVE_MINT);
        console.log('✅ NATIVE_MINT approved!');
        console.log('   Transaction:', approveResult.signature);
      } catch (err: any) {
        console.error('❌ Failed to add token:', err.message);
      }
    }
  }
}

main().catch(console.error);
