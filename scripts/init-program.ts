// scripts/init-program.ts
import { AnchorProvider, Program, setProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load IDL
const idlPath = path.join(__dirname, '../src/idl/fundraisely.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

const PROGRAM_ID = new PublicKey('DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq');

async function main() {
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);

  const program = new Program(idl, provider);

  console.log('🚀 Initializing Fundraisely Program...');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Admin:', wallet.publicKey.toBase58());

  // Derive PDAs
  const [globalConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );

  const [tokenRegistryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry')],
    PROGRAM_ID
  );

  console.log('\nPDAs:');
  console.log('  Global Config:', globalConfigPDA.toBase58());
  console.log('  Token Registry:', tokenRegistryPDA.toBase58());

  // Check if already initialized
  try {
    const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);
    console.log('\n✅ Global Config already initialized!');
    console.log('  Admin:', globalConfig.admin.toBase58());
    console.log('  Platform Wallet:', globalConfig.platformWallet.toBase58());
    console.log('  Charity Wallet:', globalConfig.charityWallet.toBase58());
    console.log('  Platform Fee:', globalConfig.platformFeeBps / 100, '%');
  } catch (e) {
    console.log('\n📝 Initializing Global Config...');

    // Platform and default charity wallets (using admin wallet for now)
    const platformWallet = wallet.publicKey;
    const charityWallet = wallet.publicKey; // Replace with real charity wallet

    const tx = await program.methods
      .initialize(platformWallet, charityWallet)
      .accounts({
        globalConfig: globalConfigPDA,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Global Config initialized!');
    console.log('Transaction:', tx);
  }

  // Check token registry
  try {
    const tokenRegistry = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    console.log('\n✅ Token Registry already initialized!');
    console.log('  Approved tokens:', tokenRegistry.approvedTokens.length);
  } catch (e) {
    console.log('\n📝 Initializing Token Registry...');

    const tx = await program.methods
      .initializeTokenRegistry()
      .accounts({
        tokenRegistry: tokenRegistryPDA,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Token Registry initialized!');
    console.log('Transaction:', tx);
  }

  console.log('\n🎉 Program initialization complete!');
  console.log('\nYou can now create rooms at: http://localhost:5173/BingoBlitz');
}

main().catch(console.error);
