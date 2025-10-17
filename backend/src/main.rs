//! # Fundraisely Backend Server
//!
//! This server acts as a proxy between the Fundraisely frontend and The Giving Block (TGB) API.
//! It provides two main functions: allowing users to search for charities by name, and fetching
//! Solana donation addresses for selected charities. By proxying TGB API calls through this backend,
//! we keep the TGB API key secure (not exposed in frontend) and can add additional business logic
//! like caching, rate limiting, or logging in the future.
//!
//! The server runs on port 3002 and exposes three endpoints:
//! - GET /api/charities?q=search_term - Search for charities by name via TGB API
//! - GET /api/charities/:id/address/:token - Get donation address for charity+token combination
//! - GET /health - Simple health check endpoint
//!
//! This backend is required for the charity selection feature in room creation to work properly.
//!
//! # Architecture
//! The application is organized into modules following Rust best practices:
//! - `config` - Environment variable loading and validation
//! - `models` - Data structures for API requests/responses
//! - `services` - Business logic and external API clients
//! - `handlers` - HTTP request handlers
//! - `routes` - Router configuration
//! - `middleware` - HTTP middleware (CORS, etc.)

use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

// Module declarations
mod config;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;

use config::{load_env, validate_env, get_tgb_api_key};
use services::TgbClient;

#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    load_env();

    // Initialize tracing for structured logging
    tracing_subscriber::fmt::init();

    // Validate all required configuration
    validate_env();

    info!("Starting Fundraisely Backend Server...");

    // Create TGB API client (shared across all requests)
    let api_key = get_tgb_api_key();
    let tgb_client = Arc::new(TgbClient::new(api_key));

    // Build router with all routes and middleware
    let app = routes::build_router(tgb_client);

    // Run server on port 3002 (port 3001 is used by WebSocket server)
    let addr = SocketAddr::from(([127, 0, 0, 1], 3002));
    info!("TGB Backend Server listening on http://{}", addr);
    info!("Health check available at http://{}/health", addr);
    info!("API endpoints:");
    info!("  - GET /api/charities?q=<search_term>");
    info!("  - GET /api/charities/<id>/address/<token>");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
