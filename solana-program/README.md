# Solana Smart Contract

This directory contains the Solana on-chain program (smart contract) for Fundraisely, written in Rust using the Anchor framework.

## Overview

The Fundraisely smart contract is a **trustless fundraising platform** that manages:
- Room creation and configuration
- Entry fee collection and distribution
- Prize distribution to winners
- Charity donations
- Token allowlist management
- Platform fee collection

**Program ID (Devnet):** `DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq`

**Network:** Solana Devnet (for testing)

## Why Blockchain?

The smart contract handles **financial** operations, ensuring:
- **Transparency**: All transactions are publicly verifiable on-chain
- **Trustlessness**: No intermediary can misappropriate funds
- **Immutability**: Distribution rules cannot be changed after room creation
- **Verifiability**: Winners, prizes, and charity allocations are permanently recorded

**What the blockchain does NOT handle:**
- Real-time game coordination (handled by WebSocket server)
- Ephemeral game state (handled by frontend + WebSocket)
- High-frequency updates (handled by off-chain systems)

## Architecture

```
solana-program/
└── fundraisely/
    ├── programs/fundraisely/src/    # Smart contract source code
    │   ├── lib.rs                   # Program entry point
    │   ├── state/                   # Account data structures
    │   │   ├── global_config.rs     # Platform configuration
    │   │   ├── room.rs              # Room account
    │   │   ├── player_entry.rs      # Player entry account
    │   │   └── token_registry.rs    # Approved tokens
    │   ├── instructions/            # Instruction handlers
    │   │   ├── admin/               # Admin instructions
    │   │   ├── room/                # Room creation
    │   │   ├── player/              # Player actions (join)
    │   │   ├── game/                # Game lifecycle (declare, end)
    │   │   └── asset/               # Asset-based rooms
    │   ├── events.rs                # Event definitions
    │   └── errors.rs                # Custom error codes
    ├── Anchor.toml                  # Anchor configuration
    ├── Cargo.toml                   # Rust dependencies
    └── target/deploy/               # Compiled program (.so file)
```

## Economic Model

### Entry Fee Distribution

When a player joins a room, their entry fee is automatically split:

| Allocation | Percentage | Configurable | Description |
|------------|------------|--------------|-------------|
| Platform Fee | 20% | ❌ Fixed | Infrastructure and development costs |
| Host Fee | 0-5% | ✅ Configurable | Incentivizes room creation |
| Prize Pool | 0-35% | ✅ Configurable | Distributed to winners |
| Charity | ≥40% | ✅ Calculated | Minimum 40%, receives remainder |

**Example (100 SOL entry fee):**
```
Platform Fee:   20 SOL (20%)
Host Fee:        5 SOL (5%)
Prize Pool:     35 SOL (35%)
Charity:        40 SOL (40%)
Total:         100 SOL
```

### Extras (100% to Charity)

Players can pay "extras" beyond the entry fee (e.g., purchasing lifelines in Quiz mode):
- **Platform Fee**: 0%
- **Host Fee**: 0%
- **Prize Pool**: 0%
- **Charity**: 100%

**Rationale:** Maximize fundraising impact while maintaining transparency.

### Prize Distribution

After the game ends, the prize pool is distributed to winners:

**Example: 3 Winners, 100 SOL Prize Pool**
```
1st Place: 50 SOL (50%)
2nd Place: 30 SOL (30%)
3rd Place: 20 SOL (20%)
```

**Configurable:** Host chooses winner percentages when creating room.

## Instructions (API)

### 1. initialize (Admin Only)

**One-time setup** of the global configuration.

**Authority:** Program admin

**Accounts:**
- `global_config` - Global configuration PDA
- `authority` - Admin wallet (signer)
- `platform_wallet` - Receives platform fees
- `charity_wallet` - Default charity wallet

**Parameters:**
```rust
pub struct Initialize {
    pub platform_wallet: Pubkey,
    pub charity_wallet: Pubkey,
}
```

**What it does:**
- Creates global configuration account
- Sets platform and default charity wallets
- Enables the program for use

**When to call:** Once during deployment

---

### 2. init_pool_room (Host)

**Create a new fundraising room** with prize pool from entry fees.

**Authority:** Room host

**Accounts:**
- `room` - Room account PDA (created)
- `host` - Host wallet (signer)
- `mint` - SPL token mint (SOL, USDC, etc.)
- `global_config` - Global configuration PDA

**Parameters:**
```rust
pub struct InitPoolRoom {
    pub room_id: String,            // Unique room identifier
    pub charity_wallet: Pubkey,     // Charity recipient
    pub entry_fee: u64,             // Entry fee in lamports/tokens
    pub max_players: u32,           // Maximum players (up to 1000)
    pub host_fee_bps: u16,          // Host fee (0-500 bps = 0-5%)
    pub prize_pool_bps: u16,        // Prize pool (0-3500 bps = 0-35%)
    pub first_place_pct: u16,       // 1st place % of prize pool
    pub second_place_pct: Option<u16>, // 2nd place % (optional)
    pub third_place_pct: Option<u16>,  // 3rd place % (optional)
    pub charity_memo: String,       // Charity description
    pub expiration_slots: Option<u64>, // Room expiration (optional)
}
```

**Validation:**
- `host_fee_bps + prize_pool_bps ≤ 6000` (charity gets ≥40%)
- `first_place_pct + second_place_pct + third_place_pct = 100`
- `max_players ≤ 1000`
- `entry_fee > 0`

**Events Emitted:**
- `RoomCreated` - Contains room details for frontend

---

### 3. join_room (Player)

**Join an existing room** by paying the entry fee.

**Authority:** Player

**Accounts:**
- `room` - Room account PDA
- `player_entry` - Player entry account PDA (created)
- `player` - Player wallet (signer)
- `player_token_account` - Player's token account (source)
- `room_vault` - Room's token vault (destination)
- `mint` - SPL token mint
- `token_program` - SPL Token program

**Parameters:**
```rust
pub struct JoinRoom {
    pub room_id: String,        // Room to join
    pub extras_amount: u64,     // Extra donation (optional, 100% to charity)
}
```

**What it does:**
1. Validate room is accepting players (not full, not ended)
2. Transfer `entry_fee + extras_amount` from player to room vault
3. Create player entry account
4. Increment room player count
5. Emit `PlayerJoined` event

**Events Emitted:**
- `PlayerJoined` - Player joined successfully

---

### 4. declare_winners (Host)

**Declare winners** before ending the room (transparency requirement).

**Authority:** Host

**Accounts:**
- `room` - Room account PDA
- `host` - Host wallet (signer, must match room.host)
- `winner_entries` - Player entry accounts for winners (up to 3)

**Parameters:**
```rust
pub struct DeclareWinners {
    pub room_id: String,
    pub winners: Vec<Pubkey>,   // Winner wallet addresses (1-3)
}
```

**Validation:**
- Host is the room creator
- Winners are valid players who joined the room
- Host is NOT a winner (prevents self-dealing)
- Number of winners matches room configuration

**What it does:**
1. Mark winners in room account
2. Emit `WinnersDeclared` event (transparency)

**Events Emitted:**
- `WinnersDeclared` - Winners publicly announced

---

### 5. end_room (Host)

**End the room** and distribute all funds.

**Authority:** Host

**Accounts:**
- `room` - Room account PDA
- `host` - Host wallet (signer)
- `room_vault` - Room's token vault (source)
- `platform_wallet_ata` - Platform fee recipient
- `host_wallet_ata` - Host fee recipient
- `charity_wallet_ata` - Charity recipient
- `winner_atas` - Winner token accounts (1-3)
- `mint` - SPL token mint
- `token_program` - SPL Token program

**Parameters:**
```rust
pub struct EndRoom {
    pub room_id: String,
    pub winners: Vec<Pubkey>,   // Winners (must match declared)
}
```

**What it does:**
1. Validate winners match `declare_winners` call
2. Calculate distributions based on room configuration
3. Transfer platform fee (20%)
4. Transfer host fee (0-5%)
5. Transfer prizes to winners (configurable split)
6. Transfer charity donation (remainder, ≥40%)
7. Mark room as ended
8. Emit `RoomEnded` event

**Security Features:**
- Checks-effects-interactions pattern (reentrancy protection)
- Verified token account ownership
- Checked arithmetic (no overflow/underflow)
- PDA-based accounts (no signature forgery)

**Events Emitted:**
- `RoomEnded` - Room finalized, funds distributed

---

## Account Structures

### GlobalConfig

**PDA Seeds:** `["global_config"]`

```rust
pub struct GlobalConfig {
    pub authority: Pubkey,          // Admin wallet
    pub platform_wallet: Pubkey,    // Platform fee recipient
    pub charity_wallet: Pubkey,     // Default charity
    pub is_paused: bool,            // Emergency pause
    pub platform_fee_bps: u16,      // Platform fee (2000 = 20%)
}
```

**Size:** ~120 bytes

---

### Room

**PDA Seeds:** `["room", room_id]`

```rust
pub struct Room {
    pub room_id: String,            // Unique identifier
    pub host: Pubkey,               // Room creator
    pub charity_wallet: Pubkey,     // Charity recipient
    pub mint: Pubkey,               // SPL token mint
    pub vault: Pubkey,              // Token vault
    pub entry_fee: u64,             // Entry fee amount
    pub max_players: u32,           // Max players
    pub current_players: u32,       // Current count
    pub host_fee_bps: u16,          // Host fee (0-500)
    pub prize_pool_bps: u16,        // Prize pool (0-3500)
    pub first_place_pct: u16,       // 1st place %
    pub second_place_pct: Option<u16>, // 2nd place %
    pub third_place_pct: Option<u16>,  // 3rd place %
    pub charity_memo: String,       // Charity description
    pub total_collected: u64,       // Total entry fees
    pub extras_collected: u64,      // Total extras (100% charity)
    pub is_ended: bool,             // Room finalized
    pub winners: Vec<Pubkey>,       // Winner wallets (1-3)
    pub expiration_slot: Option<u64>, // Expiration (optional)
}
```

**Size:** ~400 bytes

---

### PlayerEntry

**PDA Seeds:** `["player_entry", room_id, player_pubkey]`

```rust
pub struct PlayerEntry {
    pub player: Pubkey,             // Player wallet
    pub room: Pubkey,               // Room account
    pub entry_fee_paid: u64,        // Amount paid
    pub extras_paid: u64,           // Extras paid
    pub joined_at: i64,             // Timestamp
}
```

**Size:** ~128 bytes

---

### TokenRegistry

**PDA Seeds:** `["token_registry"]`

```rust
pub struct TokenRegistry {
    pub authority: Pubkey,          // Admin wallet
    pub approved_tokens: Vec<Pubkey>, // Allowed token mints
}
```

**Size:** ~128 bytes + (32 * num_tokens)

---

## Events

### RoomCreated
```rust
pub struct RoomCreated {
    pub room_id: String,
    pub host: Pubkey,
    pub charity_wallet: Pubkey,
    pub entry_fee: u64,
    pub max_players: u32,
}
```

### PlayerJoined
```rust
pub struct PlayerJoined {
    pub room_id: String,
    pub player: Pubkey,
    pub entry_fee: u64,
    pub extras: u64,
}
```

### WinnersDeclared
```rust
pub struct WinnersDeclared {
    pub room_id: String,
    pub winners: Vec<Pubkey>,
}
```

### RoomEnded
```rust
pub struct RoomEnded {
    pub room_id: String,
    pub total_collected: u64,
    pub platform_fee: u64,
    pub host_fee: u64,
    pub prize_pool: u64,
    pub charity_amount: u64,
}
```

---

## Error Codes

```rust
pub enum FundraisingError {
    #[msg("Invalid fee percentages")]
    InvalidFeePercentages,          // 6000 (0x1770)

    #[msg("Invalid prize percentages")]
    InvalidPrizePercentages,        // 6001

    #[msg("Room is full")]
    RoomFull,                       // 6002

    #[msg("Room has ended")]
    RoomEnded,                      // 6003

    #[msg("Unauthorized")]
    Unauthorized,                   // 6004

    #[msg("Winners mismatch")]
    WinnersMismatch,                // 6005

    #[msg("Host cannot be winner")]
    HostCannotBeWinner,             // 6006

    #[msg("Invalid winner count")]
    InvalidWinnerCount,             // 6007

    #[msg("Math overflow")]
    MathOverflow,                   // 6008

    #[msg("Token not approved")]
    TokenNotApproved,               // 6009
}
```

---

## Security Features

### 1. PDA-Based Accounts
All accounts use Program Derived Addresses (PDAs), preventing:
- Signature forgery
- Account spoofing
- Unauthorized state changes

### 2. Reentrancy Protection
The `end_room` instruction follows the checks-effects-interactions pattern:
1. **Checks**: Validate all inputs and state
2. **Effects**: Update state (mark room as ended)
3. **Interactions**: Transfer tokens

### 3. Checked Arithmetic
All calculations use Rust's checked arithmetic:
```rust
let platform_fee = total_collected
    .checked_mul(PLATFORM_FEE_BPS as u64)
    .ok_or(FundraisingError::MathOverflow)?
    .checked_div(10000)
    .ok_or(FundraisingError::MathOverflow)?;
```

### 4. Host Restrictions
Hosts cannot be winners, preventing self-dealing:
```rust
if winners.contains(&room.host) {
    return Err(FundraisingError::HostCannotBeWinner.into());
}
```

### 5. Token Validation
All token transfers validate:
- Token mint matches room configuration
- Token accounts owned by expected wallets
- Associated Token Account (ATA) derivation

### 6. Emergency Pause
Admin can pause the program if critical vulnerability discovered:
```rust
require!(!global_config.is_paused, FundraisingError::ProgramPaused);
```

---

## Development

### Prerequisites

**Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Solana CLI:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**Anchor:**
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli
```

### Build

```bash
cd solana-program/fundraisely
anchor build
```

**Output:** `target/deploy/fundraisely.so`

### Test

```bash
anchor test
```

**Tests include:**
- Room creation
- Player joining
- Winner declaration
- Fund distribution
- Error cases

### Deploy

**Devnet:**
```bash
anchor deploy --provider.cluster devnet
```

**Mainnet (DO NOT USE YET):**
```bash
anchor deploy --provider.cluster mainnet
```

**Update Program ID:**
After deployment, update `declare_id!` in `lib.rs` and run:
```bash
anchor keys sync
```

---

## Integration with Frontend

The frontend interacts with this program via the Anchor TypeScript client:

```typescript
// src/lib/solana/program.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Fundraisely } from './types/fundraisely'; // Generated IDL

const program = new Program<Fundraisely>(IDL, PROGRAM_ID, provider);

// Create room
await program.methods
  .initPoolRoom(
    roomId,
    charityWallet,
    entryFee,
    maxPlayers,
    hostFeeBps,
    prizePoolBps,
    // ... more params
  )
  .accounts({
    room: roomPda,
    host: wallet.publicKey,
    mint: tokenMint,
    // ... more accounts
  })
  .rpc();

// Join room
await program.methods
  .joinRoom(roomId, extrasAmount)
  .accounts({
    room: roomPda,
    playerEntry: playerEntryPda,
    player: wallet.publicKey,
    // ... more accounts
  })
  .rpc();

// End room
await program.methods
  .endRoom(roomId, winners)
  .remainingAccounts(winnerAccounts)
  .accounts({
    room: roomPda,
    host: wallet.publicKey,
    // ... more accounts
  })
  .rpc();
```

---

## Future Enhancements

- [ ] Mainnet deployment (after thorough auditing)
- [ ] Multiple charity allocations (split between charities)
- [ ] Refund mechanism (if room cancelled)
- [ ] Time-based expiration (automatic refunds)
- [ ] NFT prizes (non-fungible rewards)
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Quadratic funding integration
- [ ] Governance token for platform decisions
- [ ] Security audit (Kudelski, Trail of Bits, etc.)

---

## Related Documentation

- [Frontend Architecture](../src/README.md)
- [WebSocket Server](../server/README.md)
- [Bingo Components](../src/components/bingo/README.md)
- [Anchor Documentation](https://anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)

---

## License

MIT License - See [LICENSE](../LICENSE) file for details.
