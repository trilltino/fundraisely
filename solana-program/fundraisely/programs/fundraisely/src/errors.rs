use anchor_lang::prelude::*;

#[error_code]
pub enum FundraiselyError {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Room already exists")]
    RoomAlreadyExists,

    #[msg("Room not found")]
    RoomNotFound,

    #[msg("Room not ready for players")]
    RoomNotReady,

    #[msg("Invalid room status")]
    InvalidRoomStatus,

    #[msg("Room already ended")]
    RoomAlreadyEnded,

    #[msg("Room has expired")]
    RoomExpired,

    #[msg("Player already joined")]
    PlayerAlreadyJoined,

    #[msg("Host cannot be a winner")]
    HostCannotBeWinner,

    #[msg("Invalid winners list")]
    InvalidWinners,

    #[msg("Token not approved")]
    TokenNotApproved,

    #[msg("Invalid entry fee")]
    InvalidEntryFee,

    #[msg("Host fee exceeds maximum (5%)")]
    HostFeeTooHigh,

    #[msg("Prize pool exceeds maximum (35%)")]
    PrizePoolTooHigh,

    #[msg("Charity allocation below minimum (40%)")]
    CharityBelowMinimum,

    #[msg("Total allocation exceeds maximum")]
    TotalAllocationTooHigh,

    #[msg("Prize distribution must sum to 100")]
    InvalidPrizeDistribution,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Contract is paused")]
    EmergencyPause,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,

    #[msg("Invalid room ID (max 32 characters)")]
    InvalidRoomId,

    #[msg("Invalid memo (max 28 characters)")]
    InvalidMemo,

    #[msg("Room has reached maximum players")]
    MaxPlayersReached,
}
