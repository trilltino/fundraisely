use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

// This will be replaced with actual program ID after deployment
// Using a placeholder valid base58 key (will be replaced by anchor keys sync)
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ============================================================================
// Events
// ============================================================================
// Events allow off-chain indexers and frontends to listen for blockchain changes
// Essential for real-time UI updates and historical data tracking

/// Emitted when a new room is created
#[event]
pub struct RoomCreated {
    pub room: Pubkey,
    pub room_id: String,
    pub host: Pubkey,
    pub entry_fee: u64,
    pub max_players: u32,
    pub expiration_slot: u64,
    pub timestamp: i64,
}

/// Emitted when a player joins a room
#[event]
pub struct PlayerJoined {
    pub room: Pubkey,
    pub player: Pubkey,
    pub amount_paid: u64,
    pub extras_paid: u64,
    pub player_count: u32,
    pub timestamp: i64,
}

/// Emitted when a room ends and prizes are distributed
#[event]
pub struct RoomEnded {
    pub room: Pubkey,
    pub winners: Vec<Pubkey>,
    pub platform_amount: u64,
    pub host_amount: u64,
    pub charity_amount: u64,
    pub prize_amount: u64,
    pub total_players: u32,
    pub timestamp: i64,
}

#[program]
pub mod fundraisely {
    use super::*;

    /// Initialize the global configuration (one-time setup)
    ///
    /// This must be called by the admin before any other operations.
    /// Sets up platform fees, wallets, and economic parameters.
    pub fn initialize(
        ctx: Context<Initialize>,
        platform_wallet: Pubkey,
        charity_wallet: Pubkey,
    ) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;

        // Set configuration
        global_config.admin = ctx.accounts.admin.key();
        global_config.platform_wallet = platform_wallet;
        global_config.charity_wallet = charity_wallet;
        global_config.platform_fee_bps = 2000;      // 20% platform fee
        global_config.max_host_fee_bps = 500;       // 5% max host fee
        global_config.max_prize_pool_bps = 3500;    // 35% max prize pool
        global_config.min_charity_bps = 4000;       // 40% min charity
        global_config.emergency_pause = false;
        global_config.bump = ctx.bumps.global_config;

        msg!("✅ Fundraisely program initialized");
        msg!("   Admin: {}", ctx.accounts.admin.key());
        msg!("   Platform wallet: {}", platform_wallet);
        msg!("   Charity wallet: {}", charity_wallet);

        Ok(())
    }

    /// Create a pool-based room where prizes come from entry fee pool
    pub fn init_pool_room(
        ctx: Context<InitPoolRoom>,
        room_id: String,
        entry_fee: u64,
        max_players: u32,
        host_fee_bps: u16,
        prize_pool_bps: u16,
        first_place_pct: u16,
        second_place_pct: Option<u16>,
        third_place_pct: Option<u16>,
        charity_memo: String,
        expiration_slots: Option<u64>, // 0 or None = no expiration, e.g., 43200 = ~24 hours
    ) -> Result<()> {
        // Validation
        require!(
            !ctx.accounts.global_config.emergency_pause,
            FundraiselyError::EmergencyPause
        );

        require!(
            room_id.len() <= 32 && room_id.len() > 0,
            FundraiselyError::InvalidRoomId
        );

        require!(
            entry_fee > 0,
            FundraiselyError::InvalidEntryFee
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

        msg!("✅ Pool room created: {}", room_id);
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

    /// Join a room by paying entry fee
    pub fn join_room(
        ctx: Context<JoinRoom>,
        _room_id: String,
        extras_amount: u64,
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        let current_slot = Clock::get()?.slot;

        // Validation
        require!(
            !ctx.accounts.global_config.emergency_pause,
            FundraiselyError::EmergencyPause
        );

        // Check if room has expired
        require!(
            room.expiration_slot == 0 || current_slot < room.expiration_slot,
            FundraiselyError::RoomExpired
        );

        require!(
            room.status == RoomStatus::Ready,
            FundraiselyError::RoomNotReady
        );

        require!(
            !room.ended,
            FundraiselyError::RoomAlreadyEnded
        );

        // Check max players limit
        require!(
            room.player_count < room.max_players,
            FundraiselyError::MaxPlayersReached
        );

        // Calculate total payment
        let total_payment = room.entry_fee
            .checked_add(extras_amount)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        // Transfer tokens from player to room vault
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.player_token_account.to_account_info(),
                    to: ctx.accounts.room_vault.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            ),
            total_payment,
        )?;

        // Create player entry
        let player_entry = &mut ctx.accounts.player_entry;
        player_entry.player = ctx.accounts.player.key();
        player_entry.room = room.key();
        player_entry.entry_paid = room.entry_fee;
        player_entry.extras_paid = extras_amount;
        player_entry.total_paid = total_payment;
        player_entry.join_slot = Clock::get()?.slot;
        player_entry.bump = ctx.bumps.player_entry;

        // Update room state
        room.player_count = room.player_count
            .checked_add(1)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        room.total_collected = room.total_collected
            .checked_add(total_payment)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        room.total_entry_fees = room.total_entry_fees
            .checked_add(room.entry_fee)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        room.total_extras_fees = room.total_extras_fees
            .checked_add(extras_amount)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        // Change status to Active when first player joins
        if room.player_count == 1 {
            room.status = RoomStatus::Active;
        }

        msg!("✅ Player joined room");
        msg!("   Player: {}", ctx.accounts.player.key());
        msg!("   Payment: {} lamports", total_payment);
        msg!("   Room total: {} lamports", room.total_collected);

        // Emit event for off-chain indexers and frontend
        emit!(PlayerJoined {
            room: room.key(),
            player: ctx.accounts.player.key(),
            amount_paid: total_payment,
            extras_paid: extras_amount,
            player_count: room.player_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// End room and distribute prizes to winners
    pub fn end_room<'info>(
        ctx: Context<'_, '_, '_, 'info, EndRoom<'info>>,
        _room_id: String,
        winners: Vec<Pubkey>,
    ) -> Result<()> {
        // Read room data and validate
        let current_slot = Clock::get()?.slot;
        let is_expired = ctx.accounts.room.expiration_slot > 0 && current_slot >= ctx.accounts.room.expiration_slot;

        // Validation - only host can end room, unless it's expired (anyone can close expired rooms)
        if !is_expired {
            require!(
                ctx.accounts.host.key() == ctx.accounts.room.host,
                FundraiselyError::Unauthorized
            );
        }

        require!(
            ctx.accounts.room.status == RoomStatus::Active,
            FundraiselyError::InvalidRoomStatus
        );

        require!(
            !ctx.accounts.room.ended,
            FundraiselyError::RoomAlreadyEnded
        );

        require!(
            winners.len() > 0 && winners.len() <= 3,
            FundraiselyError::InvalidWinners
        );

        // Validate host is not a winner
        require!(
            !winners.contains(&ctx.accounts.room.host),
            FundraiselyError::HostCannotBeWinner
        );

        // Calculate fee distribution
        // Entry fees are split according to percentages
        // Extras go 100% to charity (maximizes fundraising impact)
        let entry_fees_total = ctx.accounts.room.total_entry_fees;
        let extras_total = ctx.accounts.room.total_extras_fees;

        // Apply percentage splits to entry fees only
        let platform_fee = calculate_bps(entry_fees_total, ctx.accounts.global_config.platform_fee_bps)?;
        let host_fee = calculate_bps(entry_fees_total, ctx.accounts.room.host_fee_bps)?;
        let prize_amount = calculate_bps(entry_fees_total, ctx.accounts.room.prize_pool_bps)?;

        // Charity gets remainder of entry fees PLUS all extras
        let charity_from_entry_fees = entry_fees_total
            .checked_sub(platform_fee)
            .and_then(|v| v.checked_sub(host_fee))
            .and_then(|v| v.checked_sub(prize_amount))
            .ok_or(FundraiselyError::ArithmeticUnderflow)?;

        let charity_amount = charity_from_entry_fees
            .checked_add(extras_total)
            .ok_or(FundraiselyError::ArithmeticOverflow)?;

        // Save values for later use (minimize stack usage)
        let player_count = ctx.accounts.room.player_count;
        let room_key = ctx.accounts.room.key();
        let token_prog_key = ctx.accounts.token_program.key();

        // Prepare PDA signer seeds (construct inline to avoid clones)
        let host_key = ctx.accounts.room.host;
        let bump = ctx.accounts.room.bump;
        let room_id_bytes = ctx.accounts.room.room_id.as_bytes();
        let seeds = &[
            b"room",
            host_key.as_ref(),
            room_id_bytes,
            &[bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer platform fee
        if platform_fee > 0 {
            {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.platform_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                anchor_spl::token::transfer(cpi_ctx, platform_fee)?;
            }
        }

        // Transfer host fee
        if host_fee > 0 {
            {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.host_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                anchor_spl::token::transfer(cpi_ctx, host_fee)?;
            }
        }

        // Transfer charity donation
        if charity_amount > 0 {
            {
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.charity_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                anchor_spl::token::transfer(cpi_ctx, charity_amount)?;
            }
        }

        // Distribute prizes to winners
        // Winner token accounts must be passed in ctx.remaining_accounts in the same order as winners
        // Each winner account must be a token account matching the fee_token_mint
        require!(
            ctx.remaining_accounts.len() >= winners.len(),
            FundraiselyError::InvalidWinners
        );

        for (i, winner) in winners.iter().enumerate() {
            if i < ctx.accounts.room.prize_distribution.len() && ctx.accounts.room.prize_distribution[i] > 0 {
                let winner_amount = (prize_amount as u128 * ctx.accounts.room.prize_distribution[i] as u128 / 100) as u64;

                if winner_amount > 0 && i < ctx.remaining_accounts.len() {
                    // Get winner's token account from remaining_accounts
                    let winner_token_account = &ctx.remaining_accounts[i];

                    // Verify the account is owned by the token program
                    require!(
                        winner_token_account.owner == &token_prog_key,
                        FundraiselyError::InvalidWinners
                    );

                    // Transfer prize to winner in its own scope
                    {
                        let cpi_accounts = anchor_spl::token::Transfer {
                            from: ctx.accounts.room_vault.to_account_info(),
                            to: winner_token_account.to_account_info(),
                            authority: ctx.accounts.room.to_account_info(),
                        };
                        let cpi_ctx = CpiContext::new_with_signer(
                            ctx.accounts.token_program.to_account_info(),
                            cpi_accounts,
                            signer,
                        );
                        anchor_spl::token::transfer(cpi_ctx, winner_amount)?;
                    }

                    msg!("   Winner {}: {} receives {} tokens", i + 1, winner, winner_amount);
                }
            }
        }

        // Update room state - get mutable reference after all transfers complete
        let room = &mut ctx.accounts.room;
        room.status = RoomStatus::Ended;
        room.ended = true;

        msg!("✅ Room ended and prizes distributed");
        msg!("   Entry fees: {}, Extras: {} (100% to charity)", entry_fees_total, extras_total);
        msg!("   Platform: {}, Host: {}, Charity: {}, Prizes: {}",
            platform_fee, host_fee, charity_amount, prize_amount);

        // Emit event for off-chain indexers and frontend
        emit!(RoomEnded {
            room: room_key,
            winners: winners.clone(),
            platform_amount: platform_fee,
            host_amount: host_fee,
            charity_amount,
            prize_amount,
            total_players: player_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// Context Structs

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = GlobalConfig::LEN,
        seeds = [b"global-config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct InitPoolRoom<'info> {
    #[account(
        init,
        payer = host,
        space = Room::LEN,
        seeds = [b"room", host.key().as_ref(), room_id.as_bytes()],
        bump
    )]
    pub room: Account<'info, Room>,

    #[account(
        init,
        payer = host,
        token::mint = fee_token_mint,
        token::authority = room,
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    pub fee_token_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct JoinRoom<'info> {
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump,
    )]
    pub room: Account<'info, Room>,

    #[account(
        init,
        payer = player,
        space = PlayerEntry::LEN,
        seeds = [b"player", room.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_entry: Account<'info, PlayerEntry>,

    #[account(mut)]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(
        mut,
        constraint = player_token_account.mint == room.fee_token_mint,
    )]
    pub player_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct EndRoom<'info> {
    #[account(
        mut,
        seeds = [b"room", host.key().as_ref(), room_id.as_bytes()],
        bump = room.bump,
    )]
    pub room: Account<'info, Room>,

    #[account(mut)]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub platform_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub charity_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub host_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
}

// Helper functions

fn calculate_bps(amount: u64, bps: u16) -> Result<u64> {
    const BPS_DENOMINATOR: u64 = 10000;
    amount
        .checked_mul(bps as u64)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(FundraiselyError::ArithmeticOverflow.into())
}
