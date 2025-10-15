//! # Fundraisely Backend Server
//!
//! This server acts as a proxy between the Fundraisely frontend and The Giving Block (TGB) API.
//! It provides two main functions: allowing users to search for charities by name, and fetching
//! Solana donation addresses for selected charities. By proxying TGB API calls through this backend,
//! we keep the TGB API key secure (not exposed in frontend) and can add additional business logic
//! like caching, rate limiting, or logging in the future.
//!
//! The server runs on port 3001 and exposes three endpoints:
//! - GET /api/charities?q=search_term - Search for charities by name via TGB API
//! - GET /api/charities/:id/address/:token - Get donation address for charity+token combination
//! - GET /health - Simple health check endpoint
//!
//! This backend is required for the charity selection feature in room creation to work properly.

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, error};

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Validate TGB API key exists
    let _api_key = std::env::var("TGB_API_KEY")
        .expect("TGB_API_KEY must be set in .env file");

    info!("Starting Fundraisely Backend Server...");

    // Build router
    let app = Router::new()
        .route("/api/charities", get(search_charities))
        .route("/api/charities/{id}/address/{token}", get(get_charity_address))
        .route("/health", get(health_check))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Run server on port 3002 (port 3001 is used by WebSocket server)
    let addr = SocketAddr::from(([127, 0, 0, 1], 3002));
    info!("TGB Backend Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

/// Search query parameters
#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

/// Charity data structure (simplified)
#[derive(Serialize, Deserialize, Clone, Debug)]
struct Charity {
    id: String,
    name: String,
    description: Option<String>,
    logo_url: Option<String>,
    categories: Vec<String>,
}

/// Search charities by name
async fn search_charities(
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<Charity>>, StatusCode> {
    let api_key = std::env::var("TGB_API_KEY").unwrap();

    info!("Searching charities: query={}", params.q);

    // Call The Giving Block API
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.thegivingblock.com/v1/charities/search")
        .header("Authorization", format!("Bearer {}", api_key))
        .query(&[("q", params.q)])
        .send()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                match res.json::<Vec<Charity>>().await {
                    Ok(charities) => {
                        info!("Found {} charities", charities.len());
                        Ok(Json(charities))
                    }
                    Err(e) => {
                        error!("Failed to parse TGB response: {}", e);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                }
            } else {
                error!("TGB API returned error: {}", res.status());
                Err(StatusCode::BAD_GATEWAY)
            }
        }
        Err(e) => {
            error!("Failed to call TGB API: {}", e);
            Err(StatusCode::SERVICE_UNAVAILABLE)
        }
    }
}

/// Donation address response
#[derive(Serialize, Deserialize, Debug)]
struct DonationAddress {
    charity_id: String,
    token: String,
    address: String,
    network: String,
}

/// Get donation address for charity and token
async fn get_charity_address(
    Path((charity_id, token)): Path<(String, String)>,
) -> Result<Json<DonationAddress>, StatusCode> {
    let api_key = std::env::var("TGB_API_KEY").unwrap();

    info!("Getting address: charity_id={}, token={}", charity_id, token);

    // Call The Giving Block API
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.thegivingblock.com/v1/charities/{}/address/{}",
        charity_id, token
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                match res.json::<DonationAddress>().await {
                    Ok(address) => {
                        info!("Got address: {}", address.address);
                        Ok(Json(address))
                    }
                    Err(e) => {
                        error!("Failed to parse TGB response: {}", e);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                }
            } else {
                error!("TGB API returned error: {}", res.status());
                Err(StatusCode::BAD_GATEWAY)
            }
        }
        Err(e) => {
            error!("Failed to call TGB API: {}", e);
            Err(StatusCode::SERVICE_UNAVAILABLE)
        }
    }
}
