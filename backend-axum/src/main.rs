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
