//! Handlers for charity-related API endpoints.
//!
//! This module contains HTTP handlers for searching charities and fetching
//! donation addresses from The Giving Block API.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{Charity, DonationAddress};
use crate::services::TgbClient;

/// Query parameters for charity search endpoint.
#[derive(Deserialize)]
pub struct SearchQuery {
    /// Search term to match against charity names
    pub q: String,
}

/// Handles charity search requests.
///
/// # Endpoint
/// GET /api/charities?q=search_term
///
/// # Parameters
/// * `query` - Search query parameters containing the search term
/// * `tgb_client` - Shared TGB API client instance
///
/// # Returns
/// * `200 OK` with JSON array of matching charities
/// * `502 Bad Gateway` if TGB API returns an error
/// * `503 Service Unavailable` if TGB API is unreachable
///
/// # Example
/// ```
/// GET /api/charities?q=red%20cross
/// ```
pub async fn search_charities(
    Query(query): Query<SearchQuery>,
    State(tgb_client): State<Arc<TgbClient>>,
) -> Result<Json<Vec<Charity>>, StatusCode> {
    match tgb_client.search_charities(&query.q).await {
        Ok(charities) => Ok(Json(charities)),
        Err(err) => {
            if err.contains("connect") {
                Err(StatusCode::SERVICE_UNAVAILABLE)
            } else {
                Err(StatusCode::BAD_GATEWAY)
            }
        }
    }
}

/// Handles donation address lookup requests.
///
/// # Endpoint
/// GET /api/charities/:charity_id/address/:token
///
/// # Parameters
/// * `path` - Path parameters containing charity_id and token symbol
/// * `tgb_client` - Shared TGB API client instance
///
/// # Returns
/// * `200 OK` with JSON donation address details
/// * `502 Bad Gateway` if TGB API returns an error
/// * `503 Service Unavailable` if TGB API is unreachable
///
/// # Example
/// ```
/// GET /api/charities/charity123/address/SOL
/// ```
pub async fn get_charity_address(
    Path((charity_id, token)): Path<(String, String)>,
    State(tgb_client): State<Arc<TgbClient>>,
) -> Result<Json<DonationAddress>, StatusCode> {
    match tgb_client.get_charity_address(&charity_id, &token).await {
        Ok(address) => Ok(Json(address)),
        Err(err) => {
            if err.contains("connect") {
                Err(StatusCode::SERVICE_UNAVAILABLE)
            } else {
                Err(StatusCode::BAD_GATEWAY)
            }
        }
    }
}
