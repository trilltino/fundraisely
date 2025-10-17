//! CORS (Cross-Origin Resource Sharing) middleware configuration.
//!
//! This module provides CORS configuration to allow the frontend application
//! to make requests to this backend API from different origins.

use tower_http::cors::{Any, CorsLayer};

/// Creates a permissive CORS layer for development.
///
/// This configuration allows:
/// - Any origin to make requests
/// - Any HTTP method (GET, POST, PUT, DELETE, etc.)
/// - Any headers
///
/// # Security Note
/// This is suitable for development but should be restricted in production
/// to only allow specific origins (e.g., your frontend domain).
///
/// # Example Production Config
/// ```rust,ignore
/// CorsLayer::new()
///     .allow_origin("https://fundraisely.com".parse::<HeaderValue>().unwrap())
///     .allow_methods([Method::GET, Method::POST])
///     .allow_headers([header::CONTENT_TYPE])
/// ```
///
/// # Returns
/// A configured CorsLayer ready to be added to the Axum router.
pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
}
