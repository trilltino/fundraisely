//! Handler for health check endpoint.
//!
//! Provides a simple health check endpoint to verify the server is running.

/// Health check handler.
///
/// # Endpoint
/// GET /health
///
/// # Returns
/// Always returns "OK" with HTTP 200 status.
///
/// # Usage
/// This endpoint is used by monitoring tools, load balancers, and deployment
/// systems to verify the service is healthy and responsive.
///
/// # Example
/// ```
/// GET /health
/// Response: "OK"
/// ```
pub async fn health_check() -> &'static str {
    "OK"
}
