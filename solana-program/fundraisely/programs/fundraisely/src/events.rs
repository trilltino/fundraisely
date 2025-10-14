//! # Event Definitions
//!
//! Events emitted by the Fundraisely program for off-chain indexing and real-time UI updates.
//!
//! ## Purpose
//!
//! Events enable:
//! - **Frontend Real-time Updates**: WebSocket listeners can update UI instantly when events fire
//! - **Historical Data**: Indexers can build complete transaction history
//! - **Analytics**: Track platform metrics (total raised, active rooms, player participation)
//! - **Audit Trail**: Immutable record of all platform activity
//!
//! ## Frontend Integration Example
//!
//! ```typescript
//! const listenerId = program.addEventListener("RoomCreated", (event, slot) => {
//!   console.log(`New room: ${event.roomId} by ${event.host}`);
//!   refreshRoomList();
//! });
//! ```

use anchor_lang::prelude::*;

/// Emitted when a new fundraising room is created
///
/// Allows frontends to display new rooms immediately and indexers to track all rooms.
#[event]
pub struct RoomCreated {
    /// PDA address of the created room
    pub room: Pubkey,

    /// Human-readable room identifier (max 32 chars)
    pub room_id: String,

    /// Host's wallet address
    pub host: Pubkey,

    /// Entry fee amount in token's base units
    pub entry_fee: u64,

    /// Maximum number of players allowed
    pub max_players: u32,

    /// Slot number when room expires (0 = no expiration)
    pub expiration_slot: u64,

    /// Unix timestamp of room creation
    pub timestamp: i64,
}

/// Emitted when a player joins a room
///
/// Enables real-time player count updates and participation tracking.
#[event]
pub struct PlayerJoined {
    /// Room PDA that was joined
    pub room: Pubkey,

    /// Player's wallet address
    pub player: Pubkey,

    /// Total amount paid (entry fee + extras)
    pub amount_paid: u64,

    /// Voluntary extra donation amount
    pub extras_paid: u64,

    /// Current number of players in room after this join
    pub player_count: u32,

    /// Unix timestamp of join
    pub timestamp: i64,
}

/// Emitted when winners are declared for a room
///
/// Separates winner declaration from fund distribution for transparency.
/// Must be called before end_room.
#[event]
pub struct WinnersDeclared {
    /// Room PDA for which winners were declared
    pub room: Pubkey,

    /// List of declared winners (Some = winner declared, None = position unfilled)
    /// Array always has 3 elements, but trailing elements may be None
    pub winners: [Option<Pubkey>; 3],

    /// Unix timestamp of winner declaration
    pub timestamp: i64,
}

/// Emitted when a room ends and funds are distributed
///
/// Critical for verifying transparent fund distribution and charitable impact.
#[event]
pub struct RoomEnded {
    /// Room PDA that ended
    pub room: Pubkey,

    /// List of winner wallet addresses (1-3 winners)
    pub winners: Vec<Pubkey>,

    /// Amount sent to platform wallet
    pub platform_amount: u64,

    /// Amount sent to host wallet
    pub host_amount: u64,

    /// Amount sent to charity (includes all extras)
    pub charity_amount: u64,

    /// Total prize pool distributed to winners
    pub prize_amount: u64,

    /// Total number of players who participated
    pub total_players: u32,

    /// Unix timestamp of room end
    pub timestamp: i64,
}
