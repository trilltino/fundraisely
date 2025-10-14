use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use std::{str::FromStr, sync::Arc};

use crate::models::{RoomAccount, TokenInfo};

/// Solana service for blockchain operations
pub struct SolanaService {
    rpc_client: Arc<RpcClient>,
    program_id: Pubkey,
}

impl SolanaService {
    /// Create new Solana service
    pub fn new(rpc_url: &str) -> Result<Self> {
        let rpc_client = Arc::new(RpcClient::new(rpc_url.to_string()));

        // Load program ID from environment or use default devnet ID
        let program_id_str = std::env::var("SOLANA_PROGRAM_ID")
            .unwrap_or_else(|_| "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS".to_string());

        let program_id = Pubkey::from_str(&program_id_str)
            .context("Invalid SOLANA_PROGRAM_ID in environment")?;

        tracing::info!("Initialized Solana service with RPC: {}", rpc_url);
        tracing::info!("Program ID: {}", program_id);

        Ok(Self {
            rpc_client,
            program_id,
        })
    }

    /// Get SOL balance
    pub async fn get_balance(&self, pubkey: &Pubkey) -> Result<u64> {
        let client = self.rpc_client.clone();
        let pubkey = *pubkey;

        tokio::task::spawn_blocking(move || {
            client
                .get_balance(&pubkey)
                .context("Failed to get balance")
        })
        .await?
    }

    /// Get room account data
    pub async fn get_room_account(&self, pubkey: &Pubkey) -> Result<Option<RoomAccount>> {
        let client = self.rpc_client.clone();
        let pubkey = *pubkey;

        tokio::task::spawn_blocking(move || {
            match client.get_account(&pubkey) {
                Ok(_account) => {
                    // TODO: Deserialize account data using Anchor
                    // For now, return None
                    Ok(None)
                }
                Err(e) => {
                    if e.to_string().contains("AccountNotFound") {
                        Ok(None)
                    } else {
                        Err(anyhow::anyhow!("Failed to get account: {}", e))
                    }
                }
            }
        })
        .await?
    }

    /// Get approved tokens
    pub async fn get_approved_tokens(&self) -> Result<Vec<TokenInfo>> {
        // TODO: Fetch from approved tokens PDA
        Ok(vec![])
    }

    /// Derive room PDA
    pub fn derive_room_pda(&self, host: &Pubkey, room_id: &str) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                b"room",
                host.as_ref(),
                room_id.as_bytes(),
            ],
            &self.program_id,
        )
    }

    /// Derive player PDA
    pub fn derive_player_pda(&self, room: &Pubkey, player: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                b"player",
                room.as_ref(),
                player.as_ref(),
            ],
            &self.program_id,
        )
    }
}
