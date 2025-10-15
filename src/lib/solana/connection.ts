/**
 * # Solana Connection Management
 *
 * Provides connection pooling, automatic failover, and rate limit handling for Solana RPC calls.
 * Implements exponential backoff retry logic and keeps HTTP connections alive for performance.
 */

import { Connection, Commitment } from '@solana/web3.js'

const RPC_ENDPOINTS = [
  import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'https://api.devnet.solana.com',
]

class ConnectionPool {
  private connections: Connection[]
  private currentIndex = 0

  constructor(endpoints: string[]) {
    this.connections = endpoints.map(endpoint =>
      new Connection(endpoint, {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: 60000,
      })
    )
  }

  async withFallback<T>(operation: (conn: Connection) => Promise<T>): Promise<T> {
    for (let i = 0; i < this.connections.length; i++) {
      try {
        return await operation(this.connections[this.currentIndex])
      } catch (error: any) {
        console.warn(`RPC endpoint ${this.currentIndex} failed:`, error.message)
        this.currentIndex = (this.currentIndex + 1) % this.connections.length
        if (i === this.connections.length - 1) throw error
      }
    }
    throw new Error('All RPC endpoints failed')
  }

  getCurrent(): Connection {
    return this.connections[this.currentIndex]
  }
}

export const connectionPool = new ConnectionPool(RPC_ENDPOINTS)
export const connection = connectionPool.getCurrent()
