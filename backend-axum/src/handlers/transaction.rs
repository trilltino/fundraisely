use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct BuildTransactionRequest {
    pub instruction_type: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct BuildTransactionResponse {
    pub transaction: String, // Base64 encoded transaction
    pub signers: Vec<String>,
}

/// Build Solana transaction
///
/// POST /api/build-transaction
pub async fn build_transaction(
    State(_state): State<AppState>,
    Json(req): Json<BuildTransactionRequest>,
) -> impl IntoResponse {
    tracing::info!("Building transaction: {}", req.instruction_type);

    // TODO: Implement transaction building logic
    // This would construct Anchor instructions and return serialized transactions

    Json(serde_json::json!({
        "status": "not_implemented",
        "message": "Transaction building coming soon",
        "instruction": req.instruction_type
    }))
}
