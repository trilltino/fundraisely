use axum::{extract::{Path, State}, response::IntoResponse, Json};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

use crate::AppState;

/// Get room information
///
/// GET /api/room/:pubkey
pub async fn get_room_info(
    State(state): State<AppState>,
    Path(pubkey): Path<String>,
) -> impl IntoResponse {
    let pubkey = match Pubkey::from_str(&pubkey) {
        Ok(pk) => pk,
        Err(_) => {
            return Json(serde_json::json!({
                "error": "Invalid pubkey"
            }));
        }
    };

    tracing::info!("Fetching room info for {}", pubkey);

    match state.solana_service.get_room_account(&pubkey).await {
        Ok(Some(data)) => Json(serde_json::json!({
            "success": true,
            "data": data
        })),
        Ok(None) => Json(serde_json::json!({
            "error": "Room not found"
        })),
        Err(e) => Json(serde_json::json!({
            "error": format!("Failed to fetch room: {}", e)
        })),
    }
}

/// Get token balance
///
/// GET /api/balance/:pubkey
pub async fn get_balance(
    State(state): State<AppState>,
    Path(pubkey): Path<String>,
) -> impl IntoResponse {
    let pubkey = match Pubkey::from_str(&pubkey) {
        Ok(pk) => pk,
        Err(_) => {
            return Json(serde_json::json!({
                "error": "Invalid pubkey"
            }));
        }
    };

    tracing::info!("Fetching balance for {}", pubkey);

    match state.solana_service.get_balance(&pubkey).await {
        Ok(balance) => Json(serde_json::json!({
            "success": true,
            "balance": balance,
            "lamports": balance
        })),
        Err(e) => Json(serde_json::json!({
            "error": format!("Failed to fetch balance: {}", e)
        })),
    }
}

/// Get approved tokens list
///
/// GET /api/approved-tokens
pub async fn get_approved_tokens(
    State(state): State<AppState>,
) -> impl IntoResponse {
    tracing::info!("Fetching approved tokens");

    match state.solana_service.get_approved_tokens().await {
        Ok(tokens) => Json(serde_json::json!({
            "success": true,
            "tokens": tokens
        })),
        Err(e) => Json(serde_json::json!({
            "error": format!("Failed to fetch tokens: {}", e)
        })),
    }
}
