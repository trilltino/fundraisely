//! Donation address model for blockchain donations.
//!
//! This model represents a blockchain wallet address where donations can be sent
//! for a specific charity and cryptocurrency token.

use serde::{Deserialize, Serialize};

/// Represents a donation address for a charity on a specific blockchain network.
///
/// # Fields
/// * `charity_id` - The ID of the charity this address belongs to
/// * `token` - The cryptocurrency token symbol (e.g., "SOL", "USDC")
/// * `address` - The blockchain wallet address for receiving donations
/// * `network` - The blockchain network (e.g., "solana", "ethereum")
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DonationAddress {
    pub charity_id: String,
    pub token: String,
    pub address: String,
    pub network: String,
}

impl DonationAddress {
    /// Creates a new DonationAddress instance.
    pub fn new(charity_id: String, token: String, address: String, network: String) -> Self {
        Self {
            charity_id,
            token,
            address,
            network,
        }
    }
}
