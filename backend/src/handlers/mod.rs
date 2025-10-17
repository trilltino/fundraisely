//! HTTP request handlers for API endpoints.
//!
//! This module contains handler functions that process incoming HTTP requests,
//! interact with services, and return appropriate responses.

pub mod charity_handler;
pub mod health_handler;

pub use charity_handler::{get_charity_address, search_charities};
pub use health_handler::health_check;
