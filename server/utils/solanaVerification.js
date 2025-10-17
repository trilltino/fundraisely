/**
 * Solana Blockchain Room Verification
 *
 * Queries the Solana blockchain to verify if rooms exist on-chain.
 * This is the source of truth for room existence, not in-memory state.
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import fundraiselyIDL from '../../src/idl/fundraisely.json' assert { type: 'json' };

const PROGRAM_ID = new PublicKey('DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq');
const ROOM_SEED = Buffer.from('room');

// Connection to Solana devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

/**
 * Derive Room PDA from host public key and room ID
 */
function getRoomPDA(hostPublicKey, roomId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [ROOM_SEED, hostPublicKey.toBuffer(), Buffer.from(roomId)],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Verify if a room exists on Solana blockchain
 *
 * @param {string} roomId - The room ID to verify
 * @param {string} hostWalletAddress - The host's wallet address (optional)
 * @returns {Promise<{exists: boolean, room?: any, roomPDA?: string}>}
 */
export async function verifyRoomOnChain(roomId, hostWalletAddress = null) {
  try {
    // If we have the host wallet, we can derive the exact PDA
    if (hostWalletAddress) {
      const hostPublicKey = new PublicKey(hostWalletAddress);
      const roomPDA = getRoomPDA(hostPublicKey, roomId);

      // Create a minimal provider for querying
      const provider = new AnchorProvider(
        connection,
        {} , // No wallet needed for reading
        { commitment: 'confirmed' }
      );

      const program = new Program(fundraiselyIDL, provider);

      try {
        const room = await program.account.room.fetch(roomPDA);

        return {
          exists: true,
          room: {
            roomId: roomId,
            host: room.host.toBase58(),
            charityWallet: room.charityWallet.toBase58(),
            entryFee: room.entryFee.toString(),
            maxPlayers: room.maxPlayers,
            currentPlayers: room.currentPlayers,
            gameStarted: room.gameStarted,
            gameEnded: room.gameEnded,
            feeTokenMint: room.feeTokenMint.toBase58(),
          },
          roomPDA: roomPDA.toBase58(),
        };
      } catch (err) {
        // Room doesn't exist for this host+roomId combination
        return { exists: false };
      }
    }

    // If we don't have the host wallet, we can't verify (need to search all PDAs which is expensive)
    // In production, you might maintain a lookup table or index
    return { exists: false, error: 'Host wallet address required for verification' };

  } catch (error) {
    console.error('Solana verification error:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Get room details from Solana blockchain
 *
 * @param {string} roomId - The room ID
 * @param {string} hostWalletAddress - The host's wallet address
 * @returns {Promise<any>} Room data from blockchain
 */
export async function getRoomFromChain(roomId, hostWalletAddress) {
  const result = await verifyRoomOnChain(roomId, hostWalletAddress);
  return result.exists ? result.room : null;
}
