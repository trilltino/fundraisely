# Scripts

This directory contains utility scripts for Solana program initialization and setup.

## Overview

These scripts are **one-time setup** utilities that initialize the Fundraisely smart contract on Solana devnet. They are used during development and deployment, not during regular operation.

## Scripts

### init-program.ts

**Purpose:** Initialize the Fundraisely program on Solana devnet.

**What it does:**
1. Connects to Solana devnet
2. Loads admin wallet from `~/.config/solana/id.json`
3. Derives PDAs (Program Derived Addresses):
   - `global_config` - Global configuration account
   - `token_registry` - Approved token list
4. Calls `initialize` instruction on the smart contract
5. Sets platform and charity wallets

**Usage:**
```bash
npx tsx scripts/init-program.ts
```

**Prerequisites:**
- Solana CLI installed and configured
- Wallet with devnet SOL (airdrop if needed)
- Program deployed to devnet

**Environment:**
- Network: Solana Devnet
- RPC: `https://api.devnet.solana.com`

**Output:**
```
🚀 Initializing Fundraisely Program...
Program ID: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
Admin: <your-wallet-pubkey>

PDAs:
  Global Config: <global-config-pda>
  Token Registry: <token-registry-pda>

✅ Program initialized successfully!
Transaction: <signature>
```

**When to run:** Once after deploying the program to a new network.

---

### setup-token-registry.ts

**Purpose:** Add approved SPL tokens to the token registry.

**What it does:**
1. Connects to Solana devnet
2. Loads admin wallet
3. Derives `token_registry` PDA
4. Calls `add_approved_token` for each token to approve
5. Approves common tokens:
   - SOL (native token)
   - USDC (devnet)
   - USDT (devnet)
   - Custom test tokens

**Usage:**
```bash
npx tsx scripts/setup-token-registry.ts
```

**Prerequisites:**
- `init-program.ts` has been run
- Admin wallet has devnet SOL

**Output:**
```
🪙 Setting up Token Registry...

Adding approved tokens:
  ✅ SOL: 11111111111111111111111111111111
  ✅ USDC: <usdc-mint-address>
  ✅ USDT: <usdt-mint-address>

✅ Token registry setup complete!
```

**When to run:** After `init-program.ts` or when adding new tokens.

---

### setup-token-registry-browser.js

**Purpose:** Browser-based version of `setup-token-registry.ts`.

**What it does:**
- Same as `setup-token-registry.ts`, but runs in a web browser
- Uses Phantom wallet or other browser wallet extensions
- Provides UI feedback during setup

**Usage:**
1. Open browser console
2. Copy and paste script
3. Approve transactions in wallet

**When to run:** If you don't have Node.js CLI access or prefer browser-based setup.

---

### setup-from-cli.ts

**Purpose:** Complete setup orchestrator (runs all setup scripts).

**What it does:**
1. Runs `init-program.ts`
2. Runs `setup-token-registry.ts`
3. Verifies setup was successful
4. Displays final configuration

**Usage:**
```bash
npx tsx scripts/setup-from-cli.ts
```

**Prerequisites:**
- Solana CLI configured
- Wallet with devnet SOL
- Program deployed

**Output:**
```
🚀 Fundraisely Setup Wizard

Step 1: Initializing program...
✅ Program initialized

Step 2: Setting up token registry...
✅ Token registry configured

Step 3: Verifying setup...
✅ All checks passed!

📋 Configuration Summary:
  Program ID: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
  Admin: <your-wallet>
  Platform Wallet: <platform-wallet>
  Charity Wallet: <charity-wallet>
  Approved Tokens: 3

🎉 Setup complete! Your program is ready to use.
```

**When to run:** First time setup or after redeploying to a new network.

---

## Common Workflows

### First Time Setup

```bash
# 1. Deploy program
cd solana-program/fundraisely
anchor build
anchor deploy --provider.cluster devnet

# 2. Update program ID in code
anchor keys sync

# 3. Run setup script
cd ../..
npx tsx scripts/setup-from-cli.ts
```

### Adding a New Token

```bash
# Edit setup-token-registry.ts to add new token mint
# Then run:
npx tsx scripts/setup-token-registry.ts
```

### Resetting on Devnet

```bash
# 1. Close existing accounts (to reclaim SOL)
solana program close DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq

# 2. Redeploy
cd solana-program/fundraisely
anchor deploy --provider.cluster devnet

# 3. Re-run setup
cd ../..
npx tsx scripts/setup-from-cli.ts
```

---

## Configuration

### Default Wallets

Scripts use these default wallets (can be overridden):

**Platform Wallet:**
- Receives 20% platform fee
- Address: Admin wallet (for devnet testing)

**Charity Wallet:**
- Default charity recipient
- Address: Admin wallet (for devnet testing)

**Production:** Change these to actual platform and charity wallets.

### Approved Tokens

Default approved tokens on devnet:

```typescript
const APPROVED_TOKENS = [
  'So11111111111111111111111111111111111111112', // SOL (native)
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // USDC (devnet)
  // Add more tokens as needed
];
```

---

## Technical Details

### PDAs (Program Derived Addresses)

Scripts derive these PDAs:

**Global Config:**
```typescript
const [globalConfigPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('global-config')],
  PROGRAM_ID
);
```

**Token Registry:**
```typescript
const [tokenRegistryPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('token-registry')],
  PROGRAM_ID
);
```

### Transaction Signing

Scripts use the admin wallet (loaded from `~/.config/solana/id.json`) to sign all transactions.

**Security Note:** Never commit wallet keypairs to version control!

---

## Error Handling

### Common Errors

**Error:** "Account not found"
```
Solution: Run init-program.ts first to create accounts
```

**Error:** "Insufficient funds"
```
Solution: Airdrop devnet SOL
solana airdrop 2
```

**Error:** "Program not deployed"
```
Solution: Deploy program first
cd solana-program/fundraisely
anchor deploy --provider.cluster devnet
```

**Error:** "Unauthorized"
```
Solution: Use the same wallet that deployed the program
```

---

## Development

### Running Scripts Locally

**TypeScript Scripts (*.ts):**
```bash
npx tsx scripts/<script-name>.ts
```

**JavaScript Scripts (*.js):**
```bash
node scripts/<script-name>.js
```

### Adding New Scripts

1. Create new file in `scripts/` directory
2. Follow existing script structure:
   ```typescript
   import { AnchorProvider, Program } from '@coral-xyz/anchor';
   import { Connection, Keypair } from '@solana/web3.js';

   async function main() {
     // Script logic
   }

   main().catch(console.error);
   ```
3. Add documentation to this README
4. Test on devnet before production

---

## Security Considerations

**⚠️ IMPORTANT:**
- These scripts have **admin privileges**
- They can modify program state
- Only run with trusted wallets
- Never share your wallet private key
- Use different wallets for devnet and mainnet

**Production Checklist:**
- [ ] Change platform wallet to production wallet
- [ ] Change charity wallet to production charity
- [ ] Review approved tokens list
- [ ] Test on devnet first
- [ ] Use multi-sig wallet for mainnet admin
- [ ] Secure admin private key (hardware wallet)

---

## Related Documentation

- [Solana Program](../solana-program/README.md)
- [Frontend Architecture](../src/README.md)
- [Anchor Documentation](https://anchor-lang.com/)
- [Solana CLI Documentation](https://docs.solana.com/cli)

---

## Future Improvements

- [ ] Add script to verify program setup
- [ ] Add script to monitor platform fees
- [ ] Add script to export transaction history
- [ ] Add multi-sig support for admin operations
- [ ] Add script to upgrade program
- [ ] Add automated testing for scripts
- [ ] Add CI/CD integration
