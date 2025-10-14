//! # End Room Instruction
//!
//! Finalize room, distribute prizes, and transfer charity donations.

use anchor_lang::prelude::*;
use anchor_lang::AnchorDeserialize;
use crate::state::{GlobalConfig, Room, RoomStatus};
use crate::errors::FundraiselyError;
use crate::events::RoomEnded;
use super::utils::calculate_bps;

/// End room and distribute prizes to winners
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, EndRoom<'info>>,
    _room_id: String,
    winners: Vec<Pubkey>,
) -> Result<()> {
    // REENTRANCY PROTECTION: Check and set flags FIRST before any external calls
    require!(
        !ctx.accounts.room.ended,
        FundraiselyError::RoomAlreadyEnded
    );

    require!(
        ctx.accounts.room.status == RoomStatus::Active,
        FundraiselyError::InvalidRoomStatus
    );

    // Set ended flag immediately to prevent reentrancy
    ctx.accounts.room.ended = true;
    ctx.accounts.room.status = RoomStatus::Ended;

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

    // Determine which winners to use:
    // 1. If winners were declared via declare_winners instruction, use those (room.winners)
    // 2. Otherwise, use the passed-in winners parameter (backward compatibility)
    let winners_to_use: Vec<Pubkey> = if ctx.accounts.room.winners[0].is_some() {
        // Winners were declared via declare_winners instruction
        // Convert [Option<Pubkey>; 3] to Vec<Pubkey>, filtering out None values
        ctx.accounts.room.winners
            .iter()
            .filter_map(|w| *w)
            .collect()
    } else {
        // No declared winners, use passed-in parameter (old flow for backward compatibility)
        // Validate winner count
        require!(
            winners.len() > 0 && winners.len() <= 3,
            FundraiselyError::InvalidWinners
        );

        // Validate host is not a winner
        require!(
            !winners.contains(&ctx.accounts.room.host),
            FundraiselyError::HostCannotBeWinner
        );

        winners
    };

    // Calculate fee distribution
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

    // Save values for later use
    let player_count = ctx.accounts.room.player_count;
    let room_key = ctx.accounts.room.key();
    let token_prog_key = ctx.accounts.token_program.key();

    // Prepare PDA signer seeds
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
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.platform_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                },
                signer,
            ),
            platform_fee,
        )?;
    }

    // Transfer host fee
    if host_fee > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.host_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                },
                signer,
            ),
            host_fee,
        )?;
    }

    // Transfer charity donation
    if charity_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.room_vault.to_account_info(),
                    to: ctx.accounts.charity_token_account.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                },
                signer,
            ),
            charity_amount,
        )?;
    }

    // Distribute prizes to winners
    require!(
        ctx.remaining_accounts.len() >= winners_to_use.len(),
        FundraiselyError::InvalidWinners
    );

    for (i, winner) in winners_to_use.iter().enumerate() {
        if i < ctx.accounts.room.prize_distribution.len() && ctx.accounts.room.prize_distribution[i] > 0 {
            let winner_amount = (prize_amount as u128 * ctx.accounts.room.prize_distribution[i] as u128 / 100) as u64;

            if winner_amount > 0 && i < ctx.remaining_accounts.len() {
                let winner_token_account_info = &ctx.remaining_accounts[i];

                // Verify the account is owned by the token program
                require!(
                    winner_token_account_info.owner == &token_prog_key,
                    FundraiselyError::InvalidWinners
                );

                // Deserialize and validate the token account
                // Note: We can't use Account::try_from because of lifetime issues
                // Instead, we deserialize directly and perform manual validation
                let token_account_data = winner_token_account_info.try_borrow_data()?;
                let winner_token_account = anchor_spl::token::TokenAccount::try_deserialize(&mut &token_account_data[..])?;

                // Verify token account mint matches room's fee token mint
                require!(
                    winner_token_account.mint == ctx.accounts.room.fee_token_mint,
                    FundraiselyError::InvalidTokenMint
                );

                // Verify token account owner matches winner pubkey
                require!(
                    winner_token_account.owner == *winner,
                    FundraiselyError::InvalidTokenOwner
                );

                // Transfer prize to winner
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.room_vault.to_account_info(),
                            to: winner_token_account_info.to_account_info(),
                            authority: ctx.accounts.room.to_account_info(),
                        },
                        signer,
                    ),
                    winner_amount,
                )?;

                msg!("   Winner {}: {} receives {} tokens", i + 1, winner, winner_amount);
            }
        }
    }

    msg!("✅ Room ended and prizes distributed");
    msg!("   Entry fees: {}, Extras: {} (100% to charity)", entry_fees_total, extras_total);
    msg!("   Platform: {}, Host: {}, Charity: {}, Prizes: {}",
        platform_fee, host_fee, charity_amount, prize_amount);

    // Emit event for off-chain indexers and frontend
    emit!(RoomEnded {
        room: room_key,
        winners: winners_to_use.clone(),
        platform_amount: platform_fee,
        host_amount: host_fee,
        charity_amount,
        prize_amount,
        total_players: player_count,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Accounts required for end_room instruction
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
