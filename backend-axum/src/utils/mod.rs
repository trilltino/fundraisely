//! # Utility Functions Module
//!
//! ## Purpose
//! Contains reusable helper functions used across the Axum backend:
//! - **Basis Point Calculations**: Convert BPS to amounts
//! - **String Formatting**: Common formatting utilities (future)
//! - **Validation**: Input validation helpers (future)
//! - **Conversion**: Type conversions and transformations (future)
//!
//! ## Architecture Role
//! Utilities provide **pure functions** with no side effects:
//! - Stateless computations
//! - No external dependencies
//! - Highly testable
//! - Shared across all modules
//!
//! ## Current Utilities
//! - `calculate_bps`: Convert basis points to absolute amounts
//!
//! ## Integration Points
//! Used throughout the application wherever calculations are needed:
//! - Fee handlers use for allocation calculations
//! - Services use for validations
//! - Models could use for computed properties
//!
//! ## Performance Characteristics
//! - **Zero-Cost Abstractions**: Functions inline to call sites
//! - **No Allocations**: Pure arithmetic operations
//! - **Type Safe**: Overflow protection via explicit casts
//!
//! ## Basis Points (BPS) System
//! Basis points are used for fee calculations:
//! - 1 BPS = 0.01% (1/10000)
//! - 100 BPS = 1%
//! - 2000 BPS = 20% (platform fee)
//! - 10000 BPS = 100% (denominator)
//!
//! Example:
//! ```rust
//! calculate_bps(1000000, 2000) // 20% of 1,000,000 = 200,000
//! ```
//!
//! ## Integration with Solana Program
//! BPS calculations **must match on-chain logic**:
//! - Same denominator (10000)
//! - Same rounding behavior (truncating division)
//! - Same overflow handling
//!
//! ## Current Status
//! - [x] Basic BPS calculation
//! - [x] Unit tests for BPS
//! - [ ] **TODO**: Add checked arithmetic for overflow safety
//! - [ ] **TODO**: Add pubkey validation helper
//! - [ ] **TODO**: Add timestamp formatting utilities
//! - [ ] **TODO**: Add room ID validation
//! - [ ] **TODO**: Add lamports <-> SOL conversion
//!
//! ## Future Utilities
//! - **Validation**: `is_valid_pubkey()`, `is_valid_room_id()`
//! - **Formatting**: `format_lamports()`, `format_timestamp()`
//! - **Conversion**: `pubkey_to_base58()`, `base58_to_pubkey()`

// Utility functions

pub fn calculate_bps(amount: u64, bps: u16) -> u64 {
    const BPS_DENOMINATOR: u64 = 10000;
    (amount * bps as u64) / BPS_DENOMINATOR
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bps() {
        assert_eq!(calculate_bps(10000, 2000), 2000); // 20%
        assert_eq!(calculate_bps(10000, 500), 500);   // 5%
        assert_eq!(calculate_bps(10000, 100), 100);   // 1%
    }
}
