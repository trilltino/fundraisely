use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct GlobalConfig {
    /// Admin public key (can update config)
    pub admin: Pubkey,

    /// Platform wallet (receives platform fees)
    pub platform_wallet: Pubkey,

    /// Charity wallet (receives charity donations)
    pub charity_wallet: Pubkey,

    /// Platform fee in basis points (2000 = 20%)
    pub platform_fee_bps: u16,

    /// Maximum host fee in basis points (500 = 5%)
    pub max_host_fee_bps: u16,

    /// Maximum prize pool in basis points (3500 = 35%)
    pub max_prize_pool_bps: u16,

    /// Minimum charity allocation in basis points (4000 = 40%)
    pub min_charity_bps: u16,

    /// Emergency pause flag
    pub emergency_pause: bool,

    /// PDA bump seed
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // platform_wallet
        32 + // charity_wallet
        2 + // platform_fee_bps
        2 + // max_host_fee_bps
        2 + // max_prize_pool_bps
        2 + // min_charity_bps
        1 + // emergency_pause
        1; // bump
}
