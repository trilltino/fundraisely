use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct PlayerEntry {
    /// Player's public key
    pub player: Pubkey,

    /// Room public key
    pub room: Pubkey,

    /// Entry fee paid
    pub entry_paid: u64,

    /// Extra amount paid
    pub extras_paid: u64,

    /// Total amount paid (entry + extras)
    pub total_paid: u64,

    /// Slot when player joined
    pub join_slot: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl PlayerEntry {
    pub const LEN: usize = 8 + // discriminator
        32 + // player
        32 + // room
        8 + // entry_paid
        8 + // extras_paid
        8 + // total_paid
        8 + // join_slot
        1; // bump
}
