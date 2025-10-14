use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use crate::{AppState, models::PrizeMode};

#[derive(Debug, Deserialize)]
pub struct CalculateFeesRequest {
    pub total_collected: u64,
    pub host_fee_bps: u16,
    pub prize_pool_bps: u16,
    pub prize_mode: PrizeMode,
}

#[derive(Debug, Serialize)]
pub struct CalculateFeesResponse {
    pub platform: u64,
    pub host: u64,
    pub prizes: u64,
    pub charity: u64,
}

/// Calculate fee distribution
///
/// POST /api/calculate-fees
pub async fn calculate_fees(
    State(_state): State<AppState>,
    Json(req): Json<CalculateFeesRequest>,
) -> impl IntoResponse {
    // Validation
    const PLATFORM_FEE_BPS: u16 = 2000; // 20%
    const MAX_HOST_FEE_BPS: u16 = 500; // 5%
    const MAX_COMBINED_BPS: u16 = 4000; // 40%
    const BPS_DENOMINATOR: u64 = 10000;

    if req.host_fee_bps > MAX_HOST_FEE_BPS {
        return Json(serde_json::json!({
            "error": "Host fee exceeds maximum (5%)"
        }));
    }

    if req.host_fee_bps + req.prize_pool_bps > MAX_COMBINED_BPS {
        return Json(serde_json::json!({
            "error": "Total allocation exceeds maximum (40%)"
        }));
    }

    // Calculate fees
    let platform = (req.total_collected * PLATFORM_FEE_BPS as u64) / BPS_DENOMINATOR;
    let host = (req.total_collected * req.host_fee_bps as u64) / BPS_DENOMINATOR;

    let prizes = match req.prize_mode {
        PrizeMode::PoolSplit => {
            (req.total_collected * req.prize_pool_bps as u64) / BPS_DENOMINATOR
        }
        PrizeMode::AssetBased => 0, // Prizes pre-deposited
    };

    let charity = req
        .total_collected
        .saturating_sub(platform)
        .saturating_sub(host)
        .saturating_sub(prizes);

    let response = CalculateFeesResponse {
        platform,
        host,
        prizes,
        charity,
    };

    tracing::info!("Fee calculation: {:?}", response);

    Json(serde_json::json!(response))
}
