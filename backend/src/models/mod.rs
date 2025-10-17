//! Data models for the Fundraisely backend.
//!
//! This module contains all data structures used for API requests and responses,
//! including charity information and donation addresses from The Giving Block API.

pub mod charity;
pub mod donation_address;

pub use charity::Charity;
pub use donation_address::DonationAddress;
