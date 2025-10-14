//! # Data Models Module
//!
//! ## Purpose
//! Defines Rust data structures representing Fundraisely domain entities:
//! - **Room Account**: On-chain state of a fundraising event
//! - **Token Info**: Metadata for approved SPL tokens
//! - **Prize Mode**: Enum for prize distribution strategies
//! - **Room Status**: Lifecycle states of a room
//!
//! ## Architecture Role
//! Models serve as the **type-safe contract** between layers:
//! - **Deserialization**: Parse Solana account data into Rust structs
//! - **Serialization**: Encode responses as JSON for frontend
//! - **Validation**: Enforce invariants at type level (enums prevent invalid states)
//! - **Documentation**: Self-documenting domain concepts
//!
//! ## Integration with Frontend (src/)
//! These models are serialized to JSON and sent to frontend:
//! ```json
//! {
//!   "room_id": "room-123",
//!   "host": "HostPubkey...",
//!   "status": "Active",
//!   "entry_fee": 1000000000,
//!   "player_count": 5,
//!   "total_collected": 5000000000
//! }
//! ```
//!
//! Frontend TypeScript interfaces should mirror these structures for type safety.
//!
//! ## Integration with Solana Program
//! Models **mirror** Anchor account structures from `solana-program/`:
//! - `RoomAccount` → `Room` account in Anchor program
//! - `RoomStatus` → On-chain status enum
//! - `PrizeMode` → Prize distribution configuration
//!
//! **IMPORTANT**: These models must stay synchronized with on-chain schemas.
//! Changes to Anchor structs require updating these definitions.
//!
//! ## Serialization Formats
//! - **From Blockchain**: Borsh format (Anchor default)
//! - **To Frontend**: JSON format (via Serde)
//! - **Internal**: Native Rust types
//!
//! ## Current Status
//! - [x] Prize mode enum (PoolSplit, AssetBased)
//! - [x] Room status enum (AwaitingFunding, PartiallyFunded, Ready, Active, Ended)
//! - [x] Room account structure
//! - [x] Token info structure
//! - [x] Serde serialization/deserialization
//! - [ ] **TODO**: Add Borsh deserialization for on-chain data
//! - [ ] **TODO**: Add validation methods (e.g., `is_joinable()`)
//! - [ ] **TODO**: Add conversion traits from Anchor types
//! - [ ] **TODO**: Add Player account model
//! - [ ] **TODO**: Add Prize account model
//!
//! ## Known Limitations
//! - Placeholder types (strings for pubkeys instead of Pubkey type)
//! - No Borsh support yet (can't deserialize on-chain accounts)
//! - Missing models for Player, Prize, and other on-chain accounts
//! - No validation logic on field values

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrizeMode {
    PoolSplit,
    AssetBased,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoomStatus {
    AwaitingFunding,
    PartiallyFunded,
    Ready,
    Active,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomAccount {
    pub room_id: String,
    pub host: String,
    pub entry_fee: u64,
    pub status: RoomStatus,
    pub player_count: u32,
    pub total_collected: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenInfo {
    pub mint: String,
    pub symbol: String,
    pub name: String,
    pub enabled: bool,
}
