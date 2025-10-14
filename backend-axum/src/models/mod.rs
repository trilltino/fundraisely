use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrizeMode {
    PoolSplit,
    AssetBased,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoomStatus {
    AwaitingFunding,
    PartiallyFunded,
    Ready,
    Active,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomAccount {
    pub room_id: String,
    pub host: String,
    pub entry_fee: u64,
    pub status: RoomStatus,
    pub player_count: u32,
    pub total_collected: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenInfo {
    pub mint: String,
    pub symbol: String,
    pub name: String,
    pub enabled: bool,
}
