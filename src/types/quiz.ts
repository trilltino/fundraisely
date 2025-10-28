/**
 * Quiz Game Type Definitions
 *
 * **Purpose:**
 * Defines TypeScript interfaces for the Quiz fundraising game mode, including configuration,
 * fundraising extras (power-ups), prize distribution, and blockchain integration settings.
 * These types enable type-safe quiz creation, validation, and runtime configuration.
 *
 * **Type Categories:**
 * 1. **QuizConfig** - Complete quiz room configuration (game rules + blockchain settings)
 * 2. **FundraisingOptions** - Enabled fundraising extras (buyHint, extraTime, lifeline, etc.)
 * 3. **FundraisingPrices** - Pricing for each fundraising extra
 * 4. **FundraisingExtraRule** - Usage rules per extra (max uses, when usable)
 * 5. **QuizGameType** - Predefined quiz templates (Pub Quiz, Speed Quiz, etc.)
 * 6. **Prize** - Individual prize metadata
 *
 * **Quiz vs. Bingo:**
 * - **Bingo**: Simple game, no extras, fixed 5x5 card, real-time number calling
 * - **Quiz**: Complex game, multiple extras, customizable rounds/questions, timed answers
 * - Shared: Both support blockchain payments, charity allocation, prize distribution
 *
 * **Fundraising Extras System:**
 * Players can purchase power-ups during gameplay to help them score better:
 * - `buyHint`: Reveal a hint for the current question
 * - `extraTime`: Add 10 seconds to answer timer
 * - `lifeline`: 50/50 option (eliminate 2 wrong answers)
 * - `mediaReveal`: Show media/image clue early
 * - `secondChance`: Re-answer after wrong answer
 * - `sponsoredQuestion`: Bonus points for branded question
 *
 * Each extra has a price (set by host) and usage rules (max per player, per round, etc.).
 * Extra revenue goes 100% to charity (on top of entry fee charity allocation).
 *
 * **Blockchain Integration Fields:**
 * Quiz rooms can be deployed to Solana blockchain for trustless fund management:
 * - `web3Chain`: Selected blockchain (solana/evm/stellar)
 * - `solanaCluster`: Network (devnet/mainnet/testnet)
 * - `web3CharityAddress`: Charity's wallet address (from The Giving Block API or custom)
 * - `roomContractAddress`: On-chain room PDA address
 * - `deploymentTxHash`: Transaction signature of room creation
 * - `hostFeeBps`, `prizePoolBps`, `charityBps`: Fund allocation in basis points
 *
 * **The Giving Block (TGB) Integration:**
 * When using TGB charity integration:
 * 1. Host selects charity from TGB directory
 * 2. Frontend creates "donation intent" via TGB API (charity_id, amount, token)
 * 3. TGB API returns unique wallet address for this specific donation
 * 4. `web3CharityAddress` set to TGB-provided wallet
 * 5. On game end, smart contract sends charity funds to TGB wallet
 * 6. TGB forwards funds to actual charity + provides tax receipt
 *
 * **Usage in Application:**
 * - **Quiz Wizard**: Collects config via multi-step form (StepGameType, StepPaymentMethod, etc.)
 * - **useQuizConfig**: Zustand store managing current quiz configuration
 * - **Contract Deployment**: Config serialized and sent to Solana program
 * - **Room Verification**: Players verify config before joining (entry fee, charity, prizes)
 *
 * **Configuration Flow:**
 * 1. Host selects game type (Pub Quiz, Speed Quiz) → Loads defaultConfig
 * 2. Host customizes settings (rounds, time, questions)
 * 3. Host enables fundraising extras + sets prices
 * 4. Host configures payment (Web2: cash/Revolut OR Web3: Solana/EVM)
 * 5. If Web3: Select chain, token, charity address, fee allocation
 * 6. Host reviews configuration + deploys to blockchain (if Web3)
 * 7. Config stored in `useQuizConfig` store + sent to WebSocket server
 * 8. Players join via roomId, pay entry fee, purchase extras during game
 *
 * **Example Quiz Config:**
 * ```typescript
 * const quizConfig: QuizConfig = {
 *   hostName: 'John Doe',
 *   gameType: 'pub_quiz',
 *   teamBased: false,
 *   roundCount: 5,
 *   timePerQuestion: 30,
 *   questionsPerRound: 10,
 *   useMedia: true,
 *   entryFee: '10',
 *   paymentMethod: 'web3',
 *   currencySymbol: 'USDC',
 *
 *   // Fundraising extras
 *   fundraisingOptions: {
 *     buyHint: true,
 *     extraTime: true,
 *     lifeline: true,
 *   },
 *   fundraisingPrices: {
 *     buyHint: 2,      // 2 USDC per hint
 *     extraTime: 1,    // 1 USDC per extra time
 *     lifeline: 3,     // 3 USDC per lifeline
 *   },
 *
 *   // Prize configuration
 *   prizeMode: 'split',
 *   prizeSplits: { 1: 60, 2: 30, 3: 10 }, // 1st: 60%, 2nd: 30%, 3rd: 10%
 *
 *   // Blockchain integration
 *   web3Chain: 'solana',
 *   solanaCluster: 'devnet',
 *   web3Currency: 'USDC',
 *   web3CharityAddress: 'TGB5x...xyz', // From The Giving Block API
 *   charityName: 'Doctors Without Borders',
 *   hostFeeBps: 300,      // 3% host fee
 *   prizePoolBps: 3500,   // 35% prize pool
 *   charityBps: 4200,     // 42% charity (calculated: 100% - 20% platform - 3% host - 35% prizes)
 *   maxPlayers: 100,
 *   expirationSlots: 43200, // ~24 hours
 * };
 * ```
 *
 * **Type Safety Benefits:**
 * - IntelliSense for all config fields
 * - Compile-time validation of required fields
 * - Prevents typos in field names
 * - Self-documenting configuration structure
 *
 * @module types/quiz
 * @category Type Definitions
 */

/**
 * FundraisingOptions - Enabled Fundraising Extras
 *
 * Boolean flags indicating which fundraising power-ups are enabled for a quiz.
 * Host enables these in StepFundraisingOptions and sets prices in fundraisingPrices.
 *
 * **Available Extras:**
 * - `buyHint`: Purchase a text hint for the current question (e.g., "The answer starts with 'M'")
 * - `extraTime`: Add 10 extra seconds to the answer countdown timer
 * - `lifeline`: 50/50 - Eliminate 2 incorrect answer options
 * - `mediaReveal`: Show media/image clue before question text reveals
 * - `secondChance`: Submit a second answer if first answer was wrong
 * - `sponsoredQuestion`: Bonus points for answering branded/sponsored questions correctly
 *
 * **Usage:**
 * ```typescript
 * const options: FundraisingOptions = {
 *   buyHint: true,
 *   extraTime: true,
 *   lifeline: false,
 * };
 * ```
 */
export interface FundraisingOptions {
  buyHint?: boolean;
  extraTime?: boolean;
  lifeline?: boolean;
  mediaReveal?: boolean;
  secondChance?: boolean;
  sponsoredQuestion?: boolean;
   [key: string]: boolean | undefined;
}

export interface FundraisingPrices {
  [key: string]: number; // key matches enabled extras
}

export interface FundraisingExtraRule {
  maxPerPlayer: number;
  usagePhase: 'any' | 'perRound';
}

export interface QuizConfig {
  hostName: string;
  gameType: string; // corresponds to quizGameTypes.id
  teamBased: boolean;
  roundCount: number;
  timePerQuestion: number;
  questionsPerRound?: number; // [COMPLETE] NEW: optional, supports per-round question customization
  useMedia: boolean;
  entryFee: string;
  paymentMethod: 'cash_or_revolut' | 'web3';
  fundraisingOptions: FundraisingOptions;
  fundraisingPrices?: FundraisingPrices; // [COMPLETE] NEW: map of prices for extras
  questions: unknown[];
  prizeMode?: 'split' | 'assets' | 'cash';
  prizeSplits?: Record<number, number>; // e.g., { 1: 70, 2: 30 }
  prizes?: Prize[];
  startTime?: string;
  roomId?: string;
  currencySymbol?: string;
  totalTimeSeconds?: number;

  // Blockchain integration fields
  web3Chain?: 'stellar' | 'evm' | 'solana';
  web3ChainConfirmed?: 'stellar' | 'evm' | 'solana';
  solanaCluster?: 'devnet' | 'mainnet' | 'testnet';
  web3Currency?: 'USDC' | 'SOL' | 'GLOUSD' | 'XLM';
  web3CharityAddress?: string; // Blockchain wallet address for charity
  charityName?: string; // Charity organization name
  roomContractAddress?: string; // On-chain room address (PDA for Solana)
  web3ContractAddress?: string; // Legacy field name
  contractAddress?: string; // Old field name
  deploymentTxHash?: string; // Transaction hash/signature of room creation
  hostFeeBps?: number; // Host fee in basis points (0-500 = 0-5%)
  prizePoolBps?: number; // Prize pool in basis points (0-4000 = 0-40%)
  charityBps?: number; // Charity allocation in basis points (calculated, min 4000 = 40%)
  maxPlayers?: number; // Maximum players allowed
  expirationSlots?: number; // Room expiration in slots (Solana) or seconds (EVM)
  web3PrizeSplit?: { // Prize split configuration
    charity: number;
    host: number;
    prizes: number;
  };
}

export interface QuizGameType {
  id: string;
  name: string;
  description: string;
  defaultConfig: Partial<QuizConfig>;
  fundraisingOptions: {
    [key: string]: FundraisingExtraRule;
  };

}


export interface Prize {
  place: number;
  description: string;
  sponsor?: string;
  value?: number;
  tokenAddress?: string; // Web3 only
}


  
  
  