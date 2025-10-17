//! The Giving Block (TGB) API client.
//!
//! This module provides a type-safe client for interacting with The Giving Block API,
//! handling authentication, request construction, and response parsing.

use crate::models::{Charity, DonationAddress};
use reqwest::Client;
use tracing::{error, info};

/// HTTP client for The Giving Block API.
///
/// This client handles all communication with TGB's REST API, including:
/// - Charity search by name
/// - Fetching donation addresses for specific charity/token combinations
///
/// # Authentication
/// All requests include the TGB API key in the Authorization header as a Bearer token.
pub struct TgbClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl TgbClient {
    /// Creates a new TGB API client.
    ///
    /// # Arguments
    /// * `api_key` - The Giving Block API key for authentication
    ///
    /// # Returns
    /// A new TgbClient instance configured to use TGB's production API
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.thegivingblock.com/v1".to_string(),
        }
    }

    /// Searches for charities by name.
    ///
    /// # Arguments
    /// * `query` - Search term to match against charity names
    ///
    /// # Returns
    /// * `Ok(Vec<Charity>)` - List of matching charities
    /// * `Err(String)` - Error message if request fails
    ///
    /// # Example
    /// ```no_run
    /// let client = TgbClient::new("api_key".to_string());
    /// let charities = client.search_charities("red cross").await?;
    /// ```
    pub async fn search_charities(&self, query: &str) -> Result<Vec<Charity>, String> {
        info!("TGB API: Searching charities with query='{}'", query);

        let url = format!("{}/charities/search", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .query(&[("q", query)])
            .send()
            .await
            .map_err(|e| {
                error!("TGB API: Request failed: {}", e);
                format!("Failed to connect to TGB API: {}", e)
            })?;

        if !response.status().is_success() {
            let status = response.status();
            error!("TGB API: Returned error status: {}", status);
            return Err(format!("TGB API error: {}", status));
        }

        let charities = response.json::<Vec<Charity>>().await.map_err(|e| {
            error!("TGB API: Failed to parse response: {}", e);
            format!("Failed to parse TGB response: {}", e)
        })?;

        info!("TGB API: Found {} charities", charities.len());
        Ok(charities)
    }

    /// Fetches a donation address for a specific charity and token.
    ///
    /// # Arguments
    /// * `charity_id` - The TGB charity ID
    /// * `token` - The cryptocurrency token symbol (e.g., "SOL", "USDC")
    ///
    /// # Returns
    /// * `Ok(DonationAddress)` - The donation address details
    /// * `Err(String)` - Error message if request fails
    ///
    /// # Example
    /// ```no_run
    /// let client = TgbClient::new("api_key".to_string());
    /// let address = client.get_charity_address("charity123", "SOL").await?;
    /// ```
    pub async fn get_charity_address(
        &self,
        charity_id: &str,
        token: &str,
    ) -> Result<DonationAddress, String> {
        info!(
            "TGB API: Getting address for charity_id='{}', token='{}'",
            charity_id, token
        );

        let url = format!(
            "{}/charities/{}/address/{}",
            self.base_url, charity_id, token
        );

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| {
                error!("TGB API: Request failed: {}", e);
                format!("Failed to connect to TGB API: {}", e)
            })?;

        if !response.status().is_success() {
            let status = response.status();
            error!("TGB API: Returned error status: {}", status);
            return Err(format!("TGB API error: {}", status));
        }

        let address = response.json::<DonationAddress>().await.map_err(|e| {
            error!("TGB API: Failed to parse response: {}", e);
            format!("Failed to parse TGB response: {}", e)
        })?;

        info!("TGB API: Got address: {}", address.address);
        Ok(address)
    }
}
