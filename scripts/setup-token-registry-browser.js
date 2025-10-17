/**
 * Browser Console Script - Setup Token Registry
 *
 * INSTRUCTIONS:
 * 1. Open your dApp in the browser (localhost:5173)
 * 2. Connect your Phantom wallet
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 *
 * This script will:
 * - Check if NATIVE_MINT (wrapped SOL) is approved
 * - Initialize token registry if needed
 * - Add NATIVE_MINT to approved tokens
 */

(async () => {
  const { AnchorProvider, Program, BN } = await import('@coral-xyz/anchor');
  const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
  const { NATIVE_MINT } = await import('@solana/spl-token');

  // Program constants
  const PROGRAM_ID = new PublicKey('DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq');
  const TOKEN_REGISTRY_SEED = Buffer.from('token-registry');

  console.log('\n🚀 Starting Token Registry Setup...\n');

  // Check wallet
  if (!window.solana?.isConnected) {
    console.error('❌ Please connect your Phantom wallet first!');
    return;
  }

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const provider = new AnchorProvider(connection, window.solana, { commitment: 'confirmed' });
  const wallet = provider.wallet.publicKey;

  console.log('Connected Wallet:', wallet.toBase58());
  console.log('NATIVE_MINT:', NATIVE_MINT.toBase58());

  // Get Token Registry PDA
  const [tokenRegistryPDA] = PublicKey.findProgramAddressSync(
    [TOKEN_REGISTRY_SEED],
    PROGRAM_ID
  );
  console.log('Token Registry PDA:', tokenRegistryPDA.toBase58());

  // Load IDL from your app
  let fundraiselyIDL;
  try {
    const idlModule = await import('../src/idl/fundraisely.json', { assert: { type: 'json' } });
    fundraiselyIDL = idlModule.default;
  } catch (err) {
    console.error('❌ Failed to load IDL. Make sure you are running this from the dApp page.');
    return;
  }

  const program = new Program(fundraiselyIDL, provider);

  // Check if token registry exists
  let initialized = false;
  let isApproved = false;

  try {
    const tokenRegistry = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    initialized = true;
    isApproved = tokenRegistry.approvedTokens.some(t => t.equals(NATIVE_MINT));
    console.log('\n✅ Token Registry exists');
    console.log('   Approved tokens:', tokenRegistry.approvedTokens.length);
    console.log('   NATIVE_MINT approved:', isApproved);
  } catch (err) {
    console.log('\n⚠️  Token Registry not initialized yet');
  }

  // If already approved, we're done
  if (isApproved) {
    console.log('\n🎉 NATIVE_MINT is already approved! No action needed.\n');
    return;
  }

  // Initialize if needed
  if (!initialized) {
    try {
      console.log('\n📝 Initializing Token Registry...');
      const tx = await program.methods
        .initializeTokenRegistry()
        .accounts({
          tokenRegistry: tokenRegistryPDA,
          admin: wallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Token Registry initialized!');
      console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
    } catch (err) {
      console.error('❌ Failed to initialize:', err.message);
      if (err.message.includes('Unauthorized')) {
        console.log('\n⚠️  Your wallet is not the program admin.');
        console.log('Only the program admin can initialize the token registry.\n');
      }
      return;
    }
  }

  // Add NATIVE_MINT to approved tokens
  try {
    console.log('📝 Adding NATIVE_MINT to approved tokens...');
    const tx = await program.methods
      .addApprovedToken(NATIVE_MINT)
      .accounts({
        tokenRegistry: tokenRegistryPDA,
        admin: wallet,
      })
      .rpc();

    console.log('✅ NATIVE_MINT approved!');
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Verify
    const tokenRegistry = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    const verified = tokenRegistry.approvedTokens.some(t => t.equals(NATIVE_MINT));
    console.log('✅ Verification:', verified ? 'Success!' : 'Failed');
    console.log('   Total approved tokens:', tokenRegistry.approvedTokens.length);
    console.log('\n🎉 Token registry setup complete! You can now create rooms with SOL.\n');

  } catch (err) {
    console.error('❌ Failed to add NATIVE_MINT:', err.message);
    if (err.message.includes('TokenAlreadyApproved')) {
      console.log('\n✅ NATIVE_MINT was already approved!\n');
    } else if (err.message.includes('Unauthorized')) {
      console.log('\n⚠️  Your wallet is not the program admin.');
      console.log('Only the program admin can add tokens to the registry.\n');
    }
  }
})();
