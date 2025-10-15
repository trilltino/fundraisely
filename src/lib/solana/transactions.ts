/**
 * # Transaction Builder Utilities
 *
 * Type-safe transaction construction for Fundraisely program interactions.
 * Provides a fluent builder API for assembling complex transactions with proper
 * account ordering, pre/post instructions, and signer management. Includes
 * simulation support and retry logic for robust transaction handling.
 *
 * ## Features
 * - **Fluent Builder Pattern**: Chain methods for readable transaction construction
 * - **Pre/Post Instructions**: Add setup/cleanup instructions (create ATA, close accounts)
 * - **Automatic Blockhash**: Fetches and caches recent blockhash
 * - **Transaction Simulation**: Test transactions before sending
 * - **Retry Logic**: Exponential backoff for rate limit handling
 * - **Priority Fees**: Configurable compute budget for faster confirmation
 * - **Error Handling**: Detailed error messages with program logs
 *
 * ## Usage
 * ```typescript
 * const tx = await new TransactionBuilder(connection)
 *   .addPreInstruction(createAtaIx) // Setup: Create token account
 *   .addInstruction(joinRoomIx)     // Main: Join room
 *   .addSigner(payer)               // Add signers
 *   .setPriorityFee(10000)          // Optional: Add priority fee
 *   .build()                        // Build transaction
 *
 * await tx.simulate()               // Test before sending
 * const signature = await tx.send() // Send to blockchain
 * ```
 *
 * ## Integration Points
 * - `connection.ts` - Uses connection pool for RPC calls
 * - `errors.ts` - Converts Solana errors to user-friendly messages
 * - `pdas.ts` - Derives PDAs for account resolution
 * - `useTransactions.ts` - Mutations use TransactionBuilder
 *
 * ## Related Files
 * - `accounts.ts` - Account fetching for transaction inputs
 * - Program instructions - Fundraisely instruction builders
 * - `constants.ts` - Program ID and seeds
 *
 * @see {@link https://solana.com/docs/core/transactions Solana Transaction Docs}
 * @see {@link https://solana.com/docs/core/fees Priority Fees Documentation}
 */

import {
  Connection,
  Transaction,
  TransactionInstruction,
  Signer,
  PublicKey,
  ComputeBudgetProgram,
  SendOptions,
  Commitment,
} from '@solana/web3.js'
import { connectionPool } from './connection'

/**
 * Transaction builder for fluent transaction construction
 */
export class TransactionBuilder {
  private instructions: TransactionInstruction[] = []
  private signers: Signer[] = []
  private preInstructions: TransactionInstruction[] = []
  private postInstructions: TransactionInstruction[] = []
  private feePayer?: PublicKey
  private priorityFee?: number

  constructor(private connection: Connection) {}

  /**
   * Add a main instruction to the transaction
   *
   * @param ix - Transaction instruction
   * @returns This builder for chaining
   */
  addInstruction(ix: TransactionInstruction): this {
    this.instructions.push(ix)
    return this
  }

  /**
   * Add multiple instructions at once
   *
   * @param ixs - Array of transaction instructions
   * @returns This builder for chaining
   */
  addInstructions(...ixs: TransactionInstruction[]): this {
    this.instructions.push(...ixs)
    return this
  }

  /**
   * Add a signer to the transaction
   *
   * @param signers - Keypairs that will sign the transaction
   * @returns This builder for chaining
   */
  addSigner(...signers: Signer[]): this {
    this.signers.push(...signers)
    return this
  }

  /**
   * Add a pre-instruction (setup, like creating token accounts)
   *
   * @param ix - Setup instruction
   * @returns This builder for chaining
   */
  addPreInstruction(ix: TransactionInstruction): this {
    this.preInstructions.push(ix)
    return this
  }

  /**
   * Add a post-instruction (cleanup, like closing accounts)
   *
   * @param ix - Cleanup instruction
   * @returns This builder for chaining
   */
  addPostInstruction(ix: TransactionInstruction): this {
    this.postInstructions.push(ix)
    return this
  }

  /**
   * Set the fee payer for the transaction
   *
   * @param payer - Public key of the fee payer
   * @returns This builder for chaining
   */
  setFeePayer(payer: PublicKey): this {
    this.feePayer = payer
    return this
  }

  /**
   * Set priority fee in microlamports
   *
   * @param microLamports - Priority fee (10000 = 0.00001 SOL)
   * @returns This builder for chaining
   */
  setPriorityFee(microLamports: number): this {
    this.priorityFee = microLamports
    return this
  }

  /**
   * Build the transaction (fetch blockhash, assemble instructions)
   *
   * @returns Built transaction ready to sign
   */
  async build(): Promise<Transaction> {
    // Fetch recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed')

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: this.feePayer,
    })

    // Add priority fee if specified
    if (this.priorityFee !== undefined) {
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.priorityFee,
      })
      transaction.add(priorityFeeIx)
    }

    // Add all instructions in order: priority fee -> pre -> main -> post
    transaction.add(
      ...this.preInstructions,
      ...this.instructions,
      ...this.postInstructions
    )

    // Add additional signers if any
    if (this.signers.length > 0) {
      transaction.partialSign(...this.signers)
    }

    return transaction
  }

  /**
   * Build and simulate the transaction (test before sending)
   *
   * @throws Error if simulation fails with program logs
   * @returns Simulation result
   */
  async simulate(): Promise<void> {
    const tx = await this.build()

    // Simulate transaction
    const simulation = await this.connection.simulateTransaction(tx)

    if (simulation.value.err) {
      const logs = simulation.value.logs?.join('\n') || 'No logs available'
      throw new Error(
        `Transaction simulation failed:\n` +
          `Error: ${JSON.stringify(simulation.value.err)}\n` +
          `Logs:\n${logs}`
      )
    }

    console.log('✅ Transaction simulation succeeded')
    if (simulation.value.logs) {
      console.log('Program logs:', simulation.value.logs.join('\n'))
    }
  }

  /**
   * Build, sign, and send the transaction
   *
   * @param options - Send options (commitment, skip preflight, etc.)
   * @returns Transaction signature
   */
  async send(options?: SendOptions): Promise<string> {
    const tx = await this.build()

    // Send transaction with retry logic
    return await this.sendWithRetry(tx, options)
  }

  /**
   * Send transaction with exponential backoff retry
   *
   * @param transaction - Built transaction
   * @param options - Send options
   * @returns Transaction signature
   */
  private async sendWithRetry(
    transaction: Transaction,
    options?: SendOptions,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          options || {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          }
        )

        console.log(`✅ Transaction sent: ${signature}`)
        return signature
      } catch (error: any) {
        lastError = error
        console.warn(
          `❌ Transaction send attempt ${attempt + 1} failed:`,
          error.message
        )

        // Don't retry on certain errors
        if (
          error.message.includes('0x1') || // InsufficientFunds
          error.message.includes('0x0') // Custom program error
        ) {
          throw error
        }

        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(
      `Transaction failed after ${maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * Confirm a transaction with specified commitment
   *
   * @param signature - Transaction signature
   * @param commitment - Commitment level
   * @returns Confirmation result
   */
  async confirm(
    signature: string,
    commitment: Commitment = 'confirmed'
  ): Promise<void> {
    console.log(`⏳ Confirming transaction: ${signature}`)

    const latestBlockhash = await this.connection.getLatestBlockhash()

    const confirmation = await this.connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      commitment
    )

    if (confirmation.value.err) {
      throw new Error(
        `Transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}`
      )
    }

    console.log(`✅ Transaction confirmed: ${signature}`)
  }
}

/**
 * Helper function to estimate compute units for a transaction
 *
 * @param connection - Solana connection
 * @param instructions - Array of instructions
 * @param payer - Fee payer public key
 * @returns Estimated compute units
 */
export async function estimateComputeUnits(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey
): Promise<number> {
  const testInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ]

  const testTransaction = new Transaction({
    feePayer: payer,
  }).add(...testInstructions)

  const { blockhash } = await connection.getLatestBlockhash()
  testTransaction.recentBlockhash = blockhash

  const simulation = await connection.simulateTransaction(testTransaction)

  if (simulation.value.err) {
    console.warn('Failed to estimate compute units:', simulation.value.err)
    return 200_000 // Default estimate
  }

  const unitsConsumed = simulation.value.unitsConsumed || 200_000
  // Add 20% buffer
  return Math.ceil(unitsConsumed * 1.2)
}

/**
 * Helper to create a transaction builder with connection pool
 *
 * @returns New transaction builder with pooled connection
 */
export function createTransactionBuilder(): TransactionBuilder {
  return new TransactionBuilder(connectionPool.getCurrent())
}
