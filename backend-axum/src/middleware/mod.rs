//! # Middleware Module
//!
//! ## Purpose
//! Contains Axum middleware components that process requests before/after handlers:
//! - Authentication and authorization
//! - Request logging and tracing
//! - Rate limiting (future)
//! - Error transformation (future)
//!
//! ## Architecture Role
//! Middleware forms a pipeline around request handlers:
//! ```text
//! Request → [Auth Middleware] → [Handler] → [Response Middleware] → Response
//! ```
//!
//! Each middleware can:
//! - Inspect/modify incoming requests
//! - Short-circuit and return early (e.g., 401 Unauthorized)
//! - Wrap handler execution (e.g., timing, logging)
//! - Transform responses
//!
//! ## Current Middleware
//! - `auth`: API key authentication for admin endpoints
//!
//! ## Future Middleware (Not Yet Implemented)
//! - **Rate Limiting**: Prevent abuse of public endpoints
//! - **Request ID**: Add correlation IDs for request tracking
//! - **Metrics**: Collect request duration and status codes
//! - **Compression**: Gzip/Brotli response compression
//!
//! ## Integration Points
//! Middleware is applied in `main.rs` via `.layer()`:
//! ```rust
//! Router::new()
//!     .route("/admin/...", get(handler))
//!     .layer(middleware::from_fn(auth::require_admin_auth))
//! ```
//!
//! ## Performance Characteristics
//! - **Low Overhead**: Middleware runs inline, no extra thread hops
//! - **Type Safe**: Compile-time validation of middleware stack
//! - **Composable**: Multiple middleware can be layered efficiently
//!
//! ## Current Status
//! - [x] Authentication middleware
//! - [ ] Rate limiting middleware
//! - [ ] Request ID middleware
//! - [ ] Metrics collection middleware

pub mod auth;
