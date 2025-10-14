//! # HTTP Request Handlers Module
//!
//! ## Purpose
//! This module aggregates all HTTP and WebSocket request handlers for the Axum backend.
//! Each sub-module handles a specific domain of functionality within the Fundraisely platform.
//!
//! ## Architecture Role
//! Handlers form the API layer between the frontend and backend services:
//! - **Input Validation**: Deserialize and validate incoming requests
//! - **Business Logic Coordination**: Call services to perform operations
//! - **Response Formatting**: Serialize results as JSON or WebSocket messages
//! - **Error Handling**: Convert service errors to HTTP error responses
//!
//! ## Handler Categories
//! - `fees`: Fee calculation endpoints for platform, host, prize, and charity allocations
//! - `query`: Read-only Solana blockchain queries (rooms, balances, tokens)
//! - `transaction`: Transaction building and submission endpoints
//! - `ws`: WebSocket handler for real-time bidirectional communication
//!
//! ## Integration Points
//! ### Frontend (src/)
//! - Frontend sends HTTP POST/GET requests to these handlers
//! - WebSocket connection for real-time updates
//! - JSON request/response format for easy integration
//!
//! ### Solana Program (solana-program/)
//! - Handlers use SolanaService to query program accounts
//! - Build transactions targeting program instructions
//! - Validate data against program constraints
//!
//! ## Performance Characteristics
//! - **Async Processing**: All handlers are async for non-blocking I/O
//! - **Connection Pooling**: Shared RPC client across all requests
//! - **Type Safety**: Compile-time validated request/response schemas
//!
//! ## Current Status
//! - [x] Fee calculation (fully implemented)
//! - [x] Query endpoints (basic implementation)
//! - [ ] Transaction building (stub only)
//! - [x] WebSocket (echo mode only, needs room subscriptions)

pub mod fees;
pub mod transaction;
pub mod query;
pub mod ws;

pub use fees::*;
pub use transaction::*;
pub use query::*;
pub use ws::*;
