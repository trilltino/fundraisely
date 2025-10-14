use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum PrizeMode {
    PoolSplit,    // Prizes from percentage of collected fees
    AssetBased,   // Pre-deposited prize assets
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RoomStatus {
    AwaitingFunding,  // Asset room waiting for prize deposits
    PartiallyFunded,  // Some prizes deposited
    Ready,            // Ready for players
    Active,           // Players joined, game running
    Ended,            // Game completed
}

#[account]
#[derive(Debug)]
pub struct Room {
    /// Unique room identifier (max 32 bytes)
    pub room_id: String,

    /// Host's public key
    pub host: Pubkey,

    /// Token mint for entry fees
    pub fee_token_mint: Pubkey,

    /// Entry fee amount in token base units
    pub entry_fee: u64,

    /// Host fee in basis points (0-500 = 0-5%)
    pub host_fee_bps: u16,

    /// Prize pool in basis points (0-4000 = 0-40%)
    pub prize_pool_bps: u16,

    /// Charity percentage in basis points (calculated)
    pub charity_bps: u16,

    /// Prize distribution mode
    pub prize_mode: PrizeMode,

    /// Prize distribution percentages [1st, 2nd, 3rd]
    pub prize_distribution: Vec<u16>,

    /// Room status
    pub status: RoomStatus,

    /// Number of players joined
    pub player_count: u32,

    /// Maximum number of players allowed
    pub max_players: u32,

    /// Total amount collected from all players
    pub total_collected: u64,

    /// Total from entry fees only
    pub total_entry_fees: u64,

    /// Total from extras payments
    pub total_extras_fees: u64,

    /// Game ended flag
    pub ended: bool,

    /// Slot when room was created
    pub creation_slot: u64,

    /// Slot when room expires (0 = no expiration)
    pub expiration_slot: u64,

    /// Charity memo for transfers
    pub charity_memo: String,

    /// PDA bump seed
    pub bump: u8,
}

impl Room {
    pub const LEN: usize = 8 + // discriminator
        (4 + 32) + // room_id (String)
        32 + // host
        32 + // fee_token_mint
        8 + // entry_fee
        2 + // host_fee_bps
        2 + // prize_pool_bps
        2 + // charity_bps
        1 + // prize_mode
        (4 + 3 * 2) + // prize_distribution (Vec<u16>)
        1 + // status
        4 + // player_count
        4 + // max_players
        8 + // total_collected
        8 + // total_entry_fees
        8 + // total_extras_fees
        1 + // ended
        8 + // creation_slot
        8 + // expiration_slot
        (4 + 28) + // charity_memo (String)
        1; // bump
}
