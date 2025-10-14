use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::env;

/// Simple API key authentication for admin endpoints
///
/// Usage:
/// ```
/// Router::new()
///     .route("/admin/...", ...)
///     .layer(axum::middleware::from_fn(require_admin_auth))
/// ```
pub async fn require_admin_auth(req: Request, next: Next) -> Result<Response, Response> {
    // Get API key from environment
    let expected_key = env::var("ADMIN_API_KEY").unwrap_or_else(|_| "".to_string());

    if expected_key.is_empty() {
        tracing::warn!("ADMIN_API_KEY not set - admin endpoints are unprotected!");
        // In development, allow requests without API key if not set
        #[cfg(debug_assertions)]
        {
            return Ok(next.run(req).await);
        }

        // In production, require API key
        #[cfg(not(debug_assertions))]
        {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "API key not configured").into_response());
        }
    }

    // Check Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    // Expected format: "Bearer <api-key>"
    let token = auth_header.strip_prefix("Bearer ").unwrap_or(auth_header);

    if token != expected_key {
        tracing::warn!("Unauthorized admin access attempt");
        return Err((StatusCode::UNAUTHORIZED, "Invalid or missing API key").into_response());
    }

    Ok(next.run(req).await)
}

/// Optional authentication - log warnings but allow requests
pub async fn optional_auth(req: Request, next: Next) -> Response {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    if auth_header.is_none() {
        tracing::debug!("Request without authentication");
    }

    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};

    #[tokio::test]
    async fn test_missing_auth_header() {
        env::set_var("ADMIN_API_KEY", "test-key-123");

        let req = Request::builder()
            .uri("/admin/test")
            .body(Body::empty())
            .unwrap();

        // Note: This test needs a proper Next implementation
        // Left as skeleton for reference
    }
}
