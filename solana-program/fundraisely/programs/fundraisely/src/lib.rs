//! # Fundraisely Smart Contract
//!
//! A trustless, on-chain fundraising platform built on Solana using the Anchor framework.
//!
//! ## Overview
//!
//! Fundraisely enables transparent, verifiable charitable fundraising through competitive game rooms.
//! All fund distribution logic executes on-chain, ensuring trustless operation with zero possibility
//! of fund misappropriation. Entry fees are automatically split between platform operations, hosts,
//! prize pools, and charitable causes according to immutable smart contract rules.
//!
//! ## Architecture
//!
//! This program implements five core instructions:
//!
//! 1. **initialize** - One-time setup of global configuration (platform wallets, fee structure)
//! 2. **init_pool_room** - Create a new fundraising game room with prize pool distribution
//! 3. **join_room** - Player entry with automatic fee collection and distribution
//! 4. **declare_winners** - Host declares 1-3 winners before fund distribution (transparency)
//! 5. **end_room** - Finalize game, distribute prizes, and transfer charity donations
//!
//! ## Economic Model (Trustless Distribution)
//!
//! Entry fees are automatically split via on-chain execution:
//! - **Platform Fee**: 20% (fixed) - Covers infrastructure and development
//! - **Host Fee**: 0-5% (configurable) - Incentivizes room creation
//! - **Prize Pool**: 0-35% (configurable) - Rewards to winners
//! - **Charity**: 40%+ minimum (calculated remainder) - Primary beneficiary
//!
//! **Critical Feature**: All "extras" payments (tips beyond entry fee) go 100% to charity,
//! maximizing fundraising impact while maintaining transparent accounting.
//!
//! ## Module Organization
//!
//! Following Anchor best practices, the codebase is organized into dedicated modules:
//!
//! - **state** - Account data structures (GlobalConfig, Room, PlayerEntry)
//! - **instructions** - Instruction handlers and contexts
//! - **errors** - Custom error definitions
//! - **events** - Event definitions for off-chain indexing
//!
//! ## Frontend Integration
//!
//! The frontend interacts with this program through the `useFundraiselyContract.ts` hook:
//!
//! - **Room Creation**: Host calls `createRoom()` which invokes `init_pool_room`
//! - **Joining Games**: Players call `joinRoom()` which invokes `join_room` with SPL token approval
//! - **Ending Games**: Host calls `endRoom()` which invokes `end_room` to distribute funds
//! - **Events**: Program emits RoomCreated, PlayerJoined, RoomEnded events for real-time UI updates
//!
//! ## Security Features
//!
//! - **PDA-based Accounts**: All accounts use Program Derived Addresses preventing signature forgery
//! - **Reentrancy Protection**: Checks-effects-interactions pattern in end_room
//! - **Token Validation**: Full mint and owner verification for prize distributions
//! - **Validation**: Strict checks on fee percentages, charity minimums, and winner eligibility
//! - **Emergency Pause**: Admin can halt operations if critical vulnerability discovered
//! - **Host Restrictions**: Hosts cannot be winners, preventing self-dealing
//! - **Arithmetic Safety**: All calculations use checked math to prevent overflow/underflow exploits

use anchor_lang::prelude::*;

// Module declarations
pub mod state;
pub mod instructions;
pub mod errors;
pub mod events;

// Imports for program module
use instructions::*;
use state::*;  // Needed by #[program] macro for account types
use errors::*; // Needed by #[program] macro for error types
use events::*; // Needed by emit! macro

// Program ID - will be replaced with actual ID after deployment via `anchor keys sync`
declare_id!("Gd5xJnWthgYEpS39CxWfPPg6G87BEdvDow72uWLuK1Cj");

/// Fundraisely Program
///
/// All instruction handlers are implemented in the instructions module.
/// This keeps lib.rs clean and follows Anchor's recommended project structure.
#[program]
pub mod fundraisely {
    use super::*;
    use anchor_lang::prelude::*;

    /// Initialize the global configuration (one-time setup)
    pub fn initialize(
        ctx: Context<Initialize>,
        platform_wallet: Pubkey,
        charity_wallet: Pubkey,
    ) -> Result<()> {
        instructions::admin::initialize::handler(ctx, platform_wallet, charity_wallet)
    }

    /// Create a pool-based room where prizes come from entry fee pool
    pub fn init_pool_room(
        ctx: Context<InitPoolRoom>,
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
        instructions::room::init_pool_room::handler(
            ctx,
            room_id,
            charity_wallet,
            entry_fee,
            max_players,
            host_fee_bps,
            prize_pool_bps,
            first_place_pct,
            second_place_pct,
            third_place_pct,
            charity_memo,
            expiration_slots,
        )
    }

    /// Join a room by paying entry fee
    pub fn join_room(
        ctx: Context<JoinRoom>,
        room_id: String,
        extras_amount: u64,
    ) -> Result<()> {
        instructions::player::join_room::handler(ctx, room_id, extras_amount)
    }

    /// Declare winners for a room (must be called before end_room)
    pub fn declare_winners(
        ctx: Context<DeclareWinners>,
        room_id: String,
        winners: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::game::declare_winners::handler(ctx, room_id, winners)
    }

    /// End room and distribute prizes to winners
    pub fn end_room<'info>(
        ctx: Context<'_, '_, '_, 'info, EndRoom<'info>>,
        room_id: String,
        winners: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::game::end_room::handler(ctx, room_id, winners)
    }
}
