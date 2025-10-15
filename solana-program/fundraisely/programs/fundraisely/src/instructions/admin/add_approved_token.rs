//! # Add Approved Token Instruction
//!
//! This instruction allows the registry admin to add a new SPL token mint to the global allowlist.
//! Rooms can only be created with tokens that exist in this registry. This provides centralized
//! control over which tokens are acceptable for entry fees and prizes, preventing spam tokens
//! or malicious mints from being used in the platform.

use anchor_lang::prelude::*;
use crate::{TokenRegistry, errors::FundraiselyError};

/// Add a token to the approved list
pub fn handler(ctx: Context<crate::AddApprovedToken>, token_mint: Pubkey) -> Result<()> {
    let registry = &mut ctx.accounts.token_registry;

    // Check admin
    require!(
        ctx.accounts.admin.key() == registry.admin,
        FundraiselyError::Unauthorized
    );

    // Check if already approved
    require!(
        !registry.is_token_approved(&token_mint),
        FundraiselyError::TokenAlreadyApproved
    );

    // Check capacity
    require!(
        registry.approved_tokens.len() < TokenRegistry::MAX_TOKENS,
        FundraiselyError::TokenRegistryFull
    );

    // Add token
    registry.approved_tokens.push(token_mint);

    msg!("Token approved: {}", token_mint);
    msg!("Total approved tokens: {}", registry.approved_tokens.len());

    Ok(())
}

// Note: Account struct is in lib.rs
