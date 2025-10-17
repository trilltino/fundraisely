//! HTTP middleware for the application.
//!
//! This module contains middleware that processes requests before they reach handlers,
//! such as CORS configuration, authentication, logging, etc.

pub mod cors;

pub use cors::cors_layer;
