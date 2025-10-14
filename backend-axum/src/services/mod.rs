//! # Services Module
//!
//! ## Purpose
//! Contains business logic services that encapsulate complex operations:
//! - `solana`: Blockchain interaction service (RPC queries, PDA derivation)
//!
//! ## Architecture Role
//! Services sit between handlers and external systems:
//! ```text
//! Handler → Service → External System (Solana RPC, Database, etc.)
//! ```
//!
//! Services provide:
//! - **Abstraction**: Hide implementation details from handlers
//! - **Reusability**: Shared logic across multiple handlers
//! - **Testability**: Easy to mock for unit tests
//! - **State Management**: Connection pooling, caching
//!
//! ## Current Services
//! - `SolanaService`: All Solana blockchain operations
//!
//! ## Future Services (Not Yet Implemented)
//! - **CacheService**: Redis/in-memory caching for frequently queried accounts
//! - **MetricsService**: Prometheus metrics collection
//! - **NotificationService**: WebSocket broadcast management
//! - **DatabaseService**: PostgreSQL for off-chain indexing
//!
//! ## Integration Pattern
//! Services are injected into handlers via `AppState`:
//! ```rust
//! pub struct AppState {
//!     solana_service: Arc<SolanaService>,
//!     // Future: cache_service: Arc<CacheService>,
//! }
//! ```
//!
//! ## Performance Characteristics
//! - Services are `Arc`-wrapped for cheap cloning across requests
//! - Internal connection pooling for efficient resource usage
//! - Async methods for non-blocking I/O
//!
//! ## Current Status
//! - [x] Solana service with RPC client
//! - [ ] Cache service for account data
//! - [ ] Metrics service for monitoring
//! - [ ] Database service for indexing

mod solana;

pub use solana::SolanaService;
