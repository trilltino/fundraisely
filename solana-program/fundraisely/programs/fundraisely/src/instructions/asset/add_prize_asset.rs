//! # Add Prize Asset Instruction
//!
//! Escrows a prize asset into the room's prize vault for asset-based rooms

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::state::RoomStatus;
use crate::errors::FundraiselyError;

/// Escrow a prize asset into the room
pub fn handler(
    ctx: Context<crate::AddPrizeAsset>,
    _room_id: String,
    prize_index: u8, // 0, 1, or 2
) -> Result<()> {
    let room = &mut ctx.accounts.room;

    // Only for asset-based rooms
    require!(
        room.prize_mode == crate::state::PrizeMode::AssetBased,
        FundraiselyError::InvalidRoomStatus
    );

    // Must be host
    require!(
        ctx.accounts.host.key() == room.host,
        FundraiselyError::Unauthorized
    );

    // Prize index must be valid
    require!(prize_index < 3, FundraiselyError::InvalidWinners);

    // Get prize asset info
    let prize_asset = room.prize_assets[prize_index as usize]
        .as_mut()
        .ok_or(FundraiselyError::InvalidWinners)?;

    // Check not already deposited
    require!(!prize_asset.deposited, FundraiselyError::PrizeAlreadyDeposited);

    // Transfer tokens from host to prize vault
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.host_token_account.to_account_info(),
            to: ctx.accounts.prize_vault.to_account_info(),
            authority: ctx.accounts.host.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, prize_asset.amount)?;

    // Mark as deposited
    prize_asset.deposited = true;

    msg!("Prize {} deposited: {} tokens", prize_index + 1, prize_asset.amount);

    // Check if all prizes are now deposited
    let all_deposited = room.prize_assets.iter().all(|asset| {
        asset.as_ref().map_or(true, |a| a.deposited)
    });

    if all_deposited {
        room.status = RoomStatus::Ready;
        msg!("   All prizes deposited - room is now Ready for players");
    } else {
        room.status = RoomStatus::PartiallyFunded;
        msg!("   Status: PartiallyFunded (more prizes needed)");
    }

    Ok(())
}
