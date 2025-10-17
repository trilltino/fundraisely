//! Application configuration.
//!
//! This module handles loading and managing application configuration
//! from environment variables and other sources.

pub mod environment;

pub use environment::{load_env, get_tgb_api_key, validate_env};
