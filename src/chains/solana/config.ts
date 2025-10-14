import { PublicKey } from '@solana/web3.js';

// Program IDs (update after deployment)
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'YOUR_PROGRAM_ID_HERE'
);

// Network configuration
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// RPC endpoints
export const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

// Known token mints (update with actual addresses)
export const TOKEN_MINTS = {
  USDC: new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'), // Devnet USDC
  SOL: new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL
};

// PDA seeds (must match program)
export const PDA_SEEDS = {
  GLOBAL_CONFIG: 'global-config',
  APPROVED_TOKENS: 'approved-tokens',
  ROOM: 'room',
  PLAYER: 'player',
};

// Transaction configuration
export const TX_CONFIG = {
  commitment: 'confirmed' as const,
  preflightCommitment: 'confirmed' as const,
  skipPreflight: false,
};

// Fee configuration (basis points)
export const FEES = {
  PLATFORM_BPS: 2000, // 20%
  MAX_HOST_BPS: 500,   // 5%
  MAX_COMBINED_BPS: 4000, // 40%
};
