//! API route definitions.
//!
//! This module defines all HTTP routes and builds the application router,
//! connecting URL paths to their respective handler functions.

use axum::{routing::get, Router};
use std::sync::Arc;

use crate::handlers;
use crate::middleware;
use crate::services::TgbClient;

/// Builds the complete application router with all routes and middleware.
///
/// # Arguments
/// * `tgb_client` - Shared TGB API client to be injected into handlers
///
/// # Returns
/// A configured Axum Router ready to serve HTTP requests
///
/// # Route Structure
/// - GET `/api/charities` - Search for charities by name
/// - GET `/api/charities/:id/address/:token` - Get donation address for charity
/// - GET `/health` - Health check endpoint
///
/// # Middleware
/// - CORS layer allowing all origins (suitable for development)
///
/// # State Management
/// The TgbClient is shared across all handlers using Axum's State extractor,
/// avoiding the need to create new HTTP clients for each request.
pub fn build_router(tgb_client: Arc<TgbClient>) -> Router {
    Router::new()
        // Charity endpoints
        .route("/api/charities", get(handlers::search_charities))
        .route(
            "/api/charities/{id}/address/{token}",
            get(handlers::get_charity_address),
        )
        // Health check endpoint
        .route("/health", get(handlers::health_check))
        // Add shared state
        .with_state(tgb_client)
        // Apply middleware
        .layer(middleware::cors_layer())
}
