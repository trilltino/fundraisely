//! Environment variable loading and validation.
//!
//! This module handles loading configuration from .env files and environment variables,
//! ensuring all required values are present before the application starts.

use std::env;

/// Loads environment variables from .env file.
///
/// This function should be called early in main() before accessing any environment variables.
/// It will load variables from a .env file in the project root if present.
///
/// # Panics
/// Does not panic - if .env file is missing, environment variables from the system are used.
pub fn load_env() {
    dotenvy::dotenv().ok();
}

/// Gets the TGB API key from environment variables.
///
/// # Returns
/// The TGB_API_KEY value from environment
///
/// # Panics
/// Panics if TGB_API_KEY is not set, as this is required for the application to function.
///
/// # Example
/// ```no_run
/// let api_key = get_tgb_api_key();
/// ```
pub fn get_tgb_api_key() -> String {
    env::var("TGB_API_KEY").expect("TGB_API_KEY must be set in environment or .env file")
}

/// Validates all required environment variables are present.
///
/// This function checks that all required configuration is available before
/// starting the server, providing clear error messages if anything is missing.
///
/// # Panics
/// Panics if any required environment variable is missing.
pub fn validate_env() {
    // Validate TGB API key exists
    let _ = get_tgb_api_key();
    // Add more validation as needed
}
