//! Charity model representing nonprofit organizations.
//!
//! This model represents charity data from The Giving Block API, containing
//! essential information for displaying charity options to users during room creation.

use serde::{Deserialize, Serialize};

/// Represents a nonprofit charity from The Giving Block API.
///
/// # Fields
/// * `id` - Unique identifier for the charity in TGB system
/// * `name` - Display name of the charity organization
/// * `description` - Optional brief description of the charity's mission
/// * `logo_url` - Optional URL to the charity's logo image
/// * `categories` - List of categories this charity belongs to (e.g., "Education", "Health")
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Charity {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
    pub categories: Vec<String>,
}

impl Charity {
    /// Creates a new Charity instance.
    pub fn new(
        id: String,
        name: String,
        description: Option<String>,
        logo_url: Option<String>,
        categories: Vec<String>,
    ) -> Self {
        Self {
            id,
            name,
            description,
            logo_url,
            categories,
        }
    }
}
