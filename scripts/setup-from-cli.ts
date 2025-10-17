/**
 * Setup Token Registry from CLI
 *
 * This script uses your CLI wallet (admin) to approve NATIVE_MINT
 * Run: npx tsx scripts/setup-from-cli.ts
 */

import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkTokenRegistry,
  initializeTokenRegistry,
  addApprovedToken,
} from '../src/lib/solana/program';

async function main() {
  console.log('\n🚀 Token Registry Setup (CLI)\n');

  // Load keypair from default Solana CLI location
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');

  console.log('📂 Loading keypair from:', keypairPath);

  if (!fs.existsSync(keypairPath)) {
    console.error('\n❌ Keypair file not found at:', keypairPath);
    console.log('\nPlease ensure your Solana CLI wallet exists.');
    console.log('Generate one with: solana-keygen new\n');
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('🔑 Admin wallet:', keypair.publicKey.toBase58());
  console.log('🌐 Network: Devnet\n');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');

  if (balance < 0.01 * 1e9) {
    console.log('\n⚠️  Low balance! You may need to airdrop SOL:');
    console.log(`   solana airdrop 1 ${keypair.publicKey.toBase58()} --url devnet\n`);
  }

  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

  // Check current status
  console.log('🔍 Checking token registry status...');
  const status = await checkTokenRegistry(connection, NATIVE_MINT);

  console.log('   Token Registry PDA:', status.tokenRegistryPDA.toBase58());
  console.log('   Initialized:', status.initialized);
  console.log('   NATIVE_MINT approved:', status.isApproved);
  console.log('   Total approved tokens:', status.approvedTokens.length, '\n');

  if (status.isApproved) {
    console.log('✅ NATIVE_MINT is already approved! No action needed.\n');
    return;
  }

  console.log('⚙️  Setup required. Starting...\n');

  try {
    // Initialize token registry if needed
    if (!status.initialized) {
      console.log('📝 Initializing token registry...');
      const initResult = await initializeTokenRegistry(provider);
      console.log('✅ Token registry initialized!');
      console.log('   Transaction:', initResult.signature);
      console.log('   View on Explorer:');
      console.log(`   https://explorer.solana.com/tx/${initResult.signature}?cluster=devnet\n`);

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Add NATIVE_MINT to approved tokens
    console.log('📝 Adding NATIVE_MINT to approved tokens...');
    const approveResult = await addApprovedToken(provider, NATIVE_MINT);
    console.log('✅ NATIVE_MINT approved!');
    console.log('   Transaction:', approveResult.signature);
    console.log('   View on Explorer:');
    console.log(`   https://explorer.solana.com/tx/${approveResult.signature}?cluster=devnet\n`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify
    console.log('🔍 Verifying...');
    const newStatus = await checkTokenRegistry(connection, NATIVE_MINT);

    if (newStatus.isApproved) {
      console.log('✅ Verification successful!');
      console.log('   NATIVE_MINT is now approved');
      console.log('   Total approved tokens:', newStatus.approvedTokens.length);
      console.log('\n🎉 Setup complete! You can now create rooms with SOL.\n');
    } else {
      console.log('⚠️  Verification failed. Please check the transactions on Solana Explorer.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message || error);

    if (error.message?.includes('Unauthorized') || error.message?.includes('unauthorized')) {
      console.log('\n⚠️  Authorization error. This wallet may not be the program admin.');
      console.log('Expected admin:', keypair.publicKey.toBase58());
    } else if (error.message?.includes('insufficient funds')) {
      console.log('\n⚠️  Insufficient funds. Please airdrop SOL:');
      console.log(`   solana airdrop 1 ${keypair.publicKey.toBase58()} --url devnet`);
    } else if (error.logs) {
      console.log('\nProgram logs:');
      error.logs.forEach((log: string) => console.log('   ', log));
    }

    console.log('\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
