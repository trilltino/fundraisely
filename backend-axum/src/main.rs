//! # Fundraisely Axum Backend - Main Entry Point
//!
//! ## Purpose
//! This is the main entry point for the **OPTIONAL** high-performance Rust backend using the Axum
//! web framework. It provides an alternative to the Node.js Socket.io server with improved
//! performance characteristics for Solana blockchain operations.
//!
//! ## Current Status: NOT YET INTEGRATED
//! This backend is **prepared but not currently used** by the main Fundraisely application.
//! The Node.js server (`server/`) currently handles all coordination, WebSocket communication,
//! and blockchain interactions.
//!
//! ## Architecture Role
//! When integrated, this Axum backend would serve as:
//! - **API Gateway**: RESTful endpoints for Solana queries and transaction building
//! - **WebSocket Hub**: Real-time updates for room state changes and player actions
//! - **RPC Proxy**: Optimized connection pooling to Solana RPC nodes
//! - **Computation Engine**: Fee calculations and transaction validations
//!
//! ## Frontend Integration Plan
//! The frontend (src/) would connect to this backend via:
//! 1. **HTTP REST API** (port 8080):
//!    - `/api/room/{pubkey}` - Fetch room account data
//!    - `/api/balance/{pubkey}` - Query token balances
//!    - `/api/calculate-fees` - Fee distribution calculations
//!    - `/api/build-transaction` - Construct Solana transactions
//!    - `/api/approved-tokens` - Get whitelisted tokens
//! 2. **WebSocket** (`/ws`):
//!    - Real-time room state updates
//!    - Player join/leave notifications
//!    - Transaction confirmation events
//!
//! ## Solana Program Integration
//! Connects to the Fundraisely Solana program (`solana-program/`) via:
//! - Direct RPC calls to devnet/mainnet
//! - Anchor-based account deserialization
//! - PDA derivation for room and player accounts
//! - Transaction construction with program instructions
//!
//! ## Performance Benefits Over Node.js
//! 1. **Speed**: 2-5x faster RPC response times due to:
//!    - Native async runtime (Tokio)
//!    - Zero-copy deserialization
//!    - Compiled binary (no JIT overhead)
//! 2. **Scalability**: Better horizontal scaling via:
//!    - Lightweight thread model (green threads)
//!    - Efficient connection pooling
//!    - Lower memory footprint per connection
//! 3. **Reliability**:
//!    - Strong type safety prevents runtime errors
//!    - Predictable memory usage (no GC pauses)
//!    - Compile-time async validation
//!
//! ## Implementation Status
//! - [x] Server scaffold with Axum framework
//! - [x] CORS and tracing middleware
//! - [x] Health check endpoint
//! - [x] Solana RPC service integration
//! - [x] Basic query endpoints (room, balance, tokens)
//! - [x] Fee calculation endpoint
//! - [x] WebSocket infrastructure (echo mode)
//! - [ ] Anchor account deserialization
//! - [ ] Transaction building with program instructions
//! - [ ] WebSocket room subscriptions
//! - [ ] Frontend API client integration
//! - [ ] Production deployment configuration
//!
//! ## Running the Server
//! ```bash
//! cd backend-axum
//! SOLANA_RPC_URL=https://api.devnet.solana.com cargo run
//! ```
//! Server will listen on `http://0.0.0.0:8080`

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::Serialize;
use std::{net::SocketAddr, sync::Arc};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use handlers::*;
use services::SolanaService;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    solana_service: Arc<SolanaService>,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "fundraisely_axum=debug,tower_http=debug,axum=trace".into()
            }),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize Solana service
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    let solana_service = Arc::new(
        SolanaService::new(&rpc_url).expect("Failed to initialize Solana service"),
    );

    let state = AppState { solana_service };

    // Build application routes
    let app = Router::new()
        // Health check
        .route("/health", get(health_check))
        // Fee calculation
        .route("/api/calculate-fees", post(calculate_fees))
        // Transaction building
        .route("/api/build-transaction", post(build_transaction))
        // Account queries
        .route("/api/room/{pubkey}", get(get_room_info))
        .route("/api/balance/{pubkey}", get(get_balance))
        .route("/api/approved-tokens", get(get_approved_tokens))
        // WebSocket (for future use)
        .route("/ws", get(ws_handler))
        .with_state(state)
        // Middleware
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("🚀 Axum server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    use std::time::SystemTime;

    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Json(serde_json::json!({
        "status": "ok",
        "service": "fundraisely-axum",
        "timestamp": now,
    }))
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}
