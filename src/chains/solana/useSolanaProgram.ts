import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { PROGRAM_ID } from './config';
// import FundraiselyIDL from '@/idl/fundraisely.json'; // Generated from anchor build

export function useSolanaProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;

    return new AnchorProvider(
      connection,
      wallet as any,
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
  }, [connection, wallet.publicKey]);

  const program = useMemo(() => {
    if (!provider) return null;

    // TODO: Load actual IDL
    // return new Program(FundraiselyIDL as Idl, PROGRAM_ID, provider);
    return null;
  }, [provider]);

  return {
    program,
    provider,
    connection,
    wallet,
  };
}
