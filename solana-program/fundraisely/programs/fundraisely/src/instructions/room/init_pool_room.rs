//! # Init Pool Room Instruction
//!
//! Creates a new fundraising game room with pool-based prize distribution where winners receive
//! a percentage of collected entry fees.
//!
//! ## Overview
//!
//! This instruction allows anyone to become a "host" and create a fundraising room. Hosts configure
//! the room's economic parameters (entry fee, prize split, host compensation) within the constraints
//! set by GlobalConfig. Upon creation, a Room PDA and associated token vault are initialized to
//! accept player entries and hold funds until distribution.
//!
//! ## Role in Program Architecture
//!
//! Init Pool Room is the **second instruction** in the typical program flow:
//!
//! ```text
//! 1. initialize        ← Admin creates GlobalConfig (one-time)
//! 2. init_pool_room    ← Host creates room (THIS INSTRUCTION, can happen many times)
//! 3. join_room         ← Players enter the room
//! 4. end_room          ← Host distributes funds and closes room
//! ```
//!
//! This instruction bridges the global configuration with individual game instances. Each room
//! operates independently with its own vault, but all rooms must respect the platform's economic
//! constraints (40% minimum to charity).
//!
//! ## What This Instruction Does
//!
//! 1. **Creates Room PDA**: Initializes a Room account using seeds ["room", host_pubkey, room_id]
//! 2. **Creates Room Vault**: Initializes an SPL token account that holds player funds
//! 3. **Validates Fee Structure**: Ensures host_fee + prize_pool don't violate platform rules
//! 4. **Calculates Charity Allocation**: Computes charity_bps as remainder (40%+ guaranteed)
//! 5. **Sets Room Parameters**: Stores entry fee, max players, prize distribution, expiration
//! 6. **Emits RoomCreated Event**: Notifies frontend/indexers that a new room is available
//!
//! ## Economic Parameters
//!
//! Hosts customize their room within these constraints:
//!
//! ```text
//! Required Inputs:
//!   - entry_fee: Amount players must pay (in token base units, e.g., 1000000 = 1 USDC)
//!   - max_players: Room capacity (1-1000 players)
//!   - host_fee_bps: Host compensation (0-500 = 0-5%)
//!   - prize_pool_bps: Prize pool size (0-3500 = 0-35%)
//!   - [first|second|third]_place_pct: Prize split percentages (must sum to 100)
//!
//! Auto-calculated:
//!   - charity_bps: 10000 - platform_fee(2000) - host_fee_bps - prize_pool_bps
//!   - Must be >= 4000 (40%), enforced by validation
//!
//! Example 1: Generous host maximizing charity
//!   host_fee_bps: 0 (0%)
//!   prize_pool_bps: 2000 (20%)
//!   → charity_bps: 6000 (60%)  ← 60% to charity!
//!
//! Example 2: Competitive room maximizing prizes
//!   host_fee_bps: 500 (5%)
//!   prize_pool_bps: 3500 (35%)
//!   → charity_bps: 4000 (40%)  ← Still 40% minimum to charity
//! ```
//!
//! ## Prize Distribution
//!
//! Hosts specify how prizes are split among up to 3 winners:
//!
//! ```text
//! - Winner-takes-all: [100, 0, 0]
//! - Top-heavy: [70, 20, 10]
//! - Balanced: [50, 30, 20]
//! - Percentages must sum to exactly 100
//! ```
//!
//! ## Room Expiration
//!
//! Optional expiration prevents rooms from remaining open indefinitely:
//!
//! ```text
//! - expiration_slots: Number of slots after which room expires
//! - Typical value: 43,200 (approximately 24 hours on Solana)
//! - After expiration, anyone can end the room (not just host)
//! - Prevents abandoned rooms from locking player funds
//! - Set to None/0 for no expiration (manual host closure required)
//! ```
//!
//! ## PDA Security
//!
//! Two accounts are created with deterministic addresses:
//!
//! ```text
//! Room PDA:
//!   seeds: ["room", host_pubkey, room_id]
//!   authority: Program (only program can sign for Room operations)
//!
//! Room Vault PDA:
//!   seeds: ["room-vault", room_pda]
//!   authority: Room PDA (only Room can authorize token transfers out)
//! ```
//!
//! This nesting (Program controls Room, Room controls Vault) ensures trustless fund custody.
//! Players' tokens are safe from host tampering; only the end_room instruction can move funds.
//!
//! ## Frontend Integration
//!
//! The `useFundraiselyContract.ts` hook's `createRoom()` function calls this instruction:
//!
//! ```typescript
//! const createRoom = async (params: CreateRoomParams) => {
//!   const [roomPDA] = PublicKey.findProgramAddressSync(
//!     [
//!       Buffer.from("room"),
//!       wallet.publicKey.toBuffer(),
//!       Buffer.from(params.roomId)
//!     ],
//!     program.programId
//!   );
//!
//!   const [vaultPDA] = PublicKey.findProgramAddressSync(
//!     [Buffer.from("room-vault"), roomPDA.toBuffer()],
//!     program.programId
//!   );
//!
//!   await program.methods
//!     .initPoolRoom(
//!       params.roomId,
//!       params.entryFee,
//!       params.maxPlayers,
//!       params.hostFeeBps,
//!       params.prizePoolBps,
//!       params.firstPlacePct,
//!       params.secondPlacePct,
//!       params.thirdPlacePct,
//!       params.charityMemo,
//!       params.expirationSlots
//!     )
//!     .accounts({
//!       room: roomPDA,
//!       roomVault: vaultPDA,
//!       feeTokenMint: params.tokenMint,
//!       globalConfig: globalConfigPDA,
//!       host: wallet.publicKey,
//!       systemProgram: SystemProgram.programId,
//!       tokenProgram: TOKEN_PROGRAM_ID,
//!       rent: SYSVAR_RENT_PUBKEY,
//!     })
//!     .rpc();
//! };
//! ```
//!
//! ## Validation Rules
//!
//! The instruction enforces these constraints:
//!
//! 1. **Emergency Pause Check**: Fails if GlobalConfig.emergency_pause is true
//! 2. **Room ID Length**: 1-32 characters (prevents storage bloat)
//! 3. **Entry Fee**: Must be > 0 (free rooms not allowed)
//! 4. **Max Players**: 1-1000 (prevents DoS via unbounded storage)
//! 5. **Host Fee**: 0-500 bps (0-5%, enforced by GlobalConfig.max_host_fee_bps)
//! 6. **Prize Pool**: 0-3500 bps (0-35%, enforced by GlobalConfig.max_prize_pool_bps)
//! 7. **Prize Distribution**: first + second + third = 100 exactly
//! 8. **Charity Minimum**: charity_bps >= 4000 (40%, enforced by GlobalConfig.min_charity_bps)
//!
//! ## Error Conditions
//!
//! This instruction fails if:
//! - Room with same (host, room_id) already exists
//! - Host fee exceeds 5% (HostFeeTooHigh)
//! - Prize pool exceeds 35% (PrizePoolTooHigh)
//! - Charity would be below 40% (CharityBelowMinimum)
//! - Prize distribution doesn't sum to 100 (InvalidPrizeDistribution)
//! - Invalid room_id length (InvalidRoomId)
//! - Invalid entry_fee (InvalidEntryFee)
//! - Invalid max_players (InvalidMaxPlayers)
//! - Emergency pause is active (EmergencyPause)
//! - Insufficient lamports for rent
//!
//! ## On-Chain Logs
//!
//! Successful execution emits:
//! ```text
//! Pool room created: <room_id>
//!    Entry fee: <entry_fee> lamports
//!    Max players: <max_players>
//!    Host fee: <host_fee_bps>bps, Prize pool: <prize_pool_bps>bps, Charity: <charity_bps>bps
//! ```
//!
//! ## Events
//!
//! Emits `RoomCreated` event containing:
//! - room: Room PDA address
//! - room_id: Human-readable identifier
//! - host: Host's pubkey
//! - entry_fee, max_players: Configuration
//! - expiration_slot: When room expires (0 = never)
//! - timestamp: Unix timestamp of creation
//!
//! ## Related Files
//!
//! - **state/room.rs**: Defines the Room struct and its data layout
//! - **state/global_config.rs**: Defines economic constraint limits
//! - **join_room.rs**: Handles player entry after room creation
//! - **end_room.rs**: Handles room closure and fund distribution
//! - **events.rs**: Defines the RoomCreated event structure
//! - **lib.rs**: Entry point that routes to this handler
//!
//! ## Security Features
//!
//! - **PDA Authority**: Room vault can only be controlled by Room PDA (program authority)
//! - **Economic Constraints**: Impossible to create room violating charity minimum
//! - **Capacity Limits**: max_players capped at 1000 prevents storage DoS
//! - **Input Validation**: All parameters validated before state changes
//! - **Deterministic Addressing**: Room addresses derived from (host + room_id) prevent collisions

use anchor_lang::prelude::*;
use crate::state::{RoomStatus, PrizeMode};
use crate::errors::FundraiselyError;
use crate::events::RoomCreated;

/// Create a pool-based room where prizes come from entry fee pool
pub fn handler(
    ctx: Context<crate::InitPoolRoom>,
    room_id: String,
    charity_wallet: Pubkey,
    entry_fee: u64,
    max_players: u32,
    host_fee_bps: u16,
    prize_pool_bps: u16,
    first_place_pct: u16,
    second_place_pct: Option<u16>,
    third_place_pct: Option<u16>,
    charity_memo: String,
    expiration_slots: Option<u64>,
) -> Result<()> {
    // Validation
    require!(
        !ctx.accounts.global_config.emergency_pause,
        FundraiselyError::EmergencyPause
    );

    // Validate token is approved in registry
    require!(
        ctx.accounts.token_registry.is_token_approved(&ctx.accounts.fee_token_mint.key()),
        FundraiselyError::TokenNotApproved
    );

    require!(
        room_id.len() <= 32 && room_id.len() > 0,
        FundraiselyError::InvalidRoomId
    );

    require!(
        entry_fee > 0,
        FundraiselyError::InvalidEntryFee
    );

    // Validate max_players (must be reasonable to prevent DoS)
    const MAX_PLAYERS_LIMIT: u32 = 1000;
    require!(
        max_players > 0 && max_players <= MAX_PLAYERS_LIMIT,
        FundraiselyError::InvalidMaxPlayers
    );

    // Validate host fee (max 5%)
    require!(
        host_fee_bps <= ctx.accounts.global_config.max_host_fee_bps,
        FundraiselyError::HostFeeTooHigh
    );

    // Validate prize pool (max 35%)
    require!(
        prize_pool_bps <= ctx.accounts.global_config.max_prize_pool_bps,
        FundraiselyError::PrizePoolTooHigh
    );

    // Validate prize distribution sums to 100
    let total_prize_pct = first_place_pct
        + second_place_pct.unwrap_or(0)
        + third_place_pct.unwrap_or(0);
    require!(
        total_prize_pct == 100,
        FundraiselyError::InvalidPrizeDistribution
    );

    // Initialize room
    let room = &mut ctx.accounts.room;
    room.room_id = room_id.clone();
    room.host = ctx.accounts.host.key();
    room.charity_wallet = charity_wallet;
    room.fee_token_mint = ctx.accounts.fee_token_mint.key();
    room.entry_fee = entry_fee;
    room.host_fee_bps = host_fee_bps;
    room.prize_pool_bps = prize_pool_bps;

    // Calculate charity percentage (remainder after platform + host + prizes)
    let platform_bps = ctx.accounts.global_config.platform_fee_bps;
    room.charity_bps = 10000_u16
        .saturating_sub(platform_bps)
        .saturating_sub(host_fee_bps)
        .saturating_sub(prize_pool_bps);

    // Enforce minimum charity allocation (40%)
    require!(
        room.charity_bps >= ctx.accounts.global_config.min_charity_bps,
        FundraiselyError::CharityBelowMinimum
    );

    room.prize_mode = PrizeMode::PoolSplit;
    room.prize_distribution = vec![first_place_pct, second_place_pct.unwrap_or(0), third_place_pct.unwrap_or(0)];
    room.status = RoomStatus::Ready;
    room.player_count = 0;
    room.max_players = max_players;
    room.total_collected = 0;
    room.total_entry_fees = 0;
    room.total_extras_fees = 0;
    room.ended = false;
    room.winners = [None, None, None]; // Winners not yet declared
    room.prize_assets = [None, None, None]; // No asset prizes for pool-based rooms

    let current_slot = Clock::get()?.slot;
    room.creation_slot = current_slot;

    // Set expiration slot if specified
    room.expiration_slot = if let Some(slots) = expiration_slots {
        current_slot.checked_add(slots).unwrap_or(0)
    } else {
        0 // No expiration
    };

    room.charity_memo = charity_memo;
    room.bump = ctx.bumps.room;

    msg!("Pool room created: {}", room_id);
    msg!("   Entry fee: {} lamports", entry_fee);
    msg!("   Max players: {}", max_players);
    msg!("   Host fee: {}bps, Prize pool: {}bps, Charity: {}bps",
        host_fee_bps, prize_pool_bps, room.charity_bps);

    // Emit event for off-chain indexers and frontend
    emit!(RoomCreated {
        room: room.key(),
        room_id: room_id.clone(),
        host: ctx.accounts.host.key(),
        entry_fee,
        max_players,
        expiration_slot: room.expiration_slot,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// Note: InitPoolRoom struct moved to lib.rs for Anchor macro compatibility
