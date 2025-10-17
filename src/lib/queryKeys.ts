/**
 * Query Key Factory for Fundraisely
 *
 * Centralizes all TanStack Query keys for easy invalidation and management.
 * Following TanStack Query best practices for query key organization.
 *
 * Pattern: https://tkdodo.eu/blog/effective-react-query-keys
 */

/**
 * Query key factory for all API calls
 * Enables type-safe query invalidation and prefetching
 */
export const queryKeys = {
  /**
   * Room-related query keys
   */
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.rooms.lists(), filters] as const,
    details: () => [...queryKeys.rooms.all, 'detail'] as const,
    detail: (roomId: string) => [...queryKeys.rooms.details(), roomId] as const,

    // Nested room data
    players: (roomId: string) =>
      [...queryKeys.rooms.detail(roomId), 'players'] as const,
    state: (roomId: string) =>
      [...queryKeys.rooms.detail(roomId), 'state'] as const,
  },

  /**
   * Player-related query keys
   */
  players: {
    all: ['players'] as const,
    byRoom: (roomId: string) => [...queryKeys.players.all, 'room', roomId] as const,
    byRoomAndId: (roomId: string, playerId: string) =>
      [...queryKeys.players.byRoom(roomId), playerId] as const,
  },

  /**
   * Account-related query keys (Solana wallet)
   */
  account: {
    all: ['account'] as const,
    balance: (publicKey?: string) =>
      [...queryKeys.account.all, 'balance', publicKey] as const,
    tokens: (publicKey?: string) =>
      [...queryKeys.account.all, 'tokens', publicKey] as const,
    nfts: (publicKey?: string) =>
      [...queryKeys.account.all, 'nfts', publicKey] as const,
  },

  /**
   * Transaction-related query keys
   */
  transactions: {
    all: ['transactions'] as const,
    byRoom: (roomId: string) =>
      [...queryKeys.transactions.all, 'room', roomId] as const,
    bySignature: (signature: string) =>
      [...queryKeys.transactions.all, 'signature', signature] as const,
    recent: (publicKey?: string) =>
      [...queryKeys.transactions.all, 'recent', publicKey] as const,
  },

  /**
   * Solana program state query keys
   */
  program: {
    all: ['program'] as const,
    globalConfig: () => [...queryKeys.program.all, 'globalConfig'] as const,
    tokenRegistry: () => [...queryKeys.program.all, 'tokenRegistry'] as const,
    room: (roomId: string) => [...queryKeys.program.all, 'room', roomId] as const,
    roomVault: (roomId: string) =>
      [...queryKeys.program.all, 'roomVault', roomId] as const,
    playerEntry: (roomId: string, playerId: string) =>
      [...queryKeys.program.all, 'playerEntry', roomId, playerId] as const,
  },

  /**
   * Charity-related query keys (The Giving Block)
   */
  charities: {
    all: ['charities'] as const,
    search: (query: string) =>
      [...queryKeys.charities.all, 'search', query] as const,
    detail: (charityId: string) =>
      [...queryKeys.charities.all, 'detail', charityId] as const,
    address: (charityId: string, token: string) =>
      [...queryKeys.charities.detail(charityId), 'address', token] as const,
  },

  /**
   * Quiz-related query keys
   */
  quiz: {
    all: ['quiz'] as const,
    games: () => [...queryKeys.quiz.all, 'games'] as const,
    game: (gameId: string) => [...queryKeys.quiz.games(), gameId] as const,
    questions: (gameId: string) =>
      [...queryKeys.quiz.game(gameId), 'questions'] as const,
  },
} as const;

/**
 * Helper to invalidate all room-related queries
 */
export const invalidateRoomQueries = (
  queryClient: any,
  roomId?: string
) => {
  if (roomId) {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.rooms.detail(roomId),
    });
  }
  return queryClient.invalidateQueries({
    queryKey: queryKeys.rooms.all,
  });
};

/**
 * Helper to invalidate all player queries for a room
 */
export const invalidatePlayerQueries = (
  queryClient: any,
  roomId: string
) => {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.players.byRoom(roomId),
  });
};

/**
 * Helper to invalidate account balance
 */
export const invalidateAccountBalance = (
  queryClient: any,
  publicKey?: string
) => {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.account.balance(publicKey),
  });
};
