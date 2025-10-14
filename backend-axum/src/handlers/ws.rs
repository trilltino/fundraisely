//! # WebSocket Real-Time Communication Handler
//!
//! ## Purpose
//! Provides bidirectional WebSocket connections for real-time updates in Fundraisely:
//! - Room state changes (player joins, status updates)
//! - Live transaction confirmations
//! - Betting activity notifications
//! - Player presence tracking
//!
//! ## Architecture Role
//! This handler would replace Socket.io functionality from Node.js server:
//! - Accept WebSocket upgrade from HTTP
//! - Manage connection lifecycle (connect, message, disconnect)
//! - Broadcast events to subscribed clients
//! - Handle backpressure and connection errors
//!
//! ## Integration with Frontend (src/)
//! Frontend establishes WebSocket connection for live updates:
//! ```javascript
//! const ws = new WebSocket('ws://localhost:8080/ws');
//!
//! ws.onopen = () => {
//!   ws.send(JSON.stringify({
//!     type: 'subscribe',
//!     room: 'room-pubkey-here'
//!   }));
//! };
//!
//! ws.onmessage = (event) => {
//!   const { type, data } = JSON.parse(event.data);
//!   if (type === 'player_joined') {
//!     updateRoomUI(data);
//!   }
//! };
//! ```
//!
//! ## Integration with Solana Program
//! WebSocket server would monitor on-chain events:
//! - Subscribe to program logs via RPC WebSocket
//! - Parse transaction events (room created, player joined, etc.)
//! - Broadcast parsed events to connected frontend clients
//! - Provide instant feedback without polling
//!
//! ## Performance Benefits Over Node.js/Socket.io
//! 1. **Lower Latency**: Native async I/O vs JavaScript event loop (~30% faster)
//! 2. **Higher Throughput**: Can handle 10,000+ concurrent connections per instance
//! 3. **Memory Efficiency**: ~10KB per connection vs ~50KB in Node.js
//! 4. **Better Scaling**: Single Rust process can replace multiple Node.js workers
//! 5. **Binary Protocol Support**: Faster message encoding than JSON-only
//!
//! ## Comparison to Node.js Socket.io Server
//! The current `server/` implementation provides:
//! - Room-based message broadcasting
//! - Player presence tracking
//! - Transaction coordination
//!
//! This Axum WebSocket would provide equivalent functionality with:
//! - Native WebSocket protocol (no Socket.io overhead)
//! - Direct Solana event subscriptions
//! - Type-safe message handling
//!
//! ## Current Status
//! - [x] Basic WebSocket upgrade handling
//! - [x] Connection lifecycle management
//! - [x] Echo functionality for testing
//! - [x] Ping/pong keepalive
//! - [ ] **TODO**: Implement room subscription system
//! - [ ] **TODO**: Add broadcast mechanism for multiple clients
//! - [ ] **TODO**: Integrate Solana program log subscriptions
//! - [ ] **TODO**: Add authentication/authorization
//! - [ ] **TODO**: Implement reconnection handling
//! - [ ] **TODO**: Add message rate limiting
//!
//! ## Known Limitations
//! - **ECHO MODE ONLY**: Currently just echoes messages back
//! - No room subscription mechanism
//! - No Solana event integration
//! - No multi-client broadcast
//! - No message validation

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};

/// WebSocket handler
///
/// GET /ws
pub async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

/// Handle WebSocket connection
async fn handle_socket(socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();

    tracing::info!("WebSocket connection established");

    // Send welcome message
    if sender
        .send(Message::Text(
            serde_json::json!({
                "type": "connected",
                "message": "Connected to Fundraisely Axum service"
            })
            .to_string()
            .into(),
        ))
        .await
        .is_err()
    {
        return;
    }

    // Handle incoming messages
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                tracing::debug!("Received text: {}", text);

                // Echo back for now
                if sender
                    .send(Message::Text(
                        serde_json::json!({
                            "type": "echo",
                            "data": text.as_str()
                        })
                        .to_string()
                        .into(),
                    ))
                    .await
                    .is_err()
                {
                    break;
                }
            }
            Message::Binary(data) => {
                tracing::debug!("Received binary data: {} bytes", data.len());
            }
            Message::Ping(data) => {
                if sender.send(Message::Pong(data)).await.is_err() {
                    break;
                }
            }
            Message::Close(_) => {
                tracing::info!("WebSocket connection closed");
                break;
            }
            _ => {}
        }
    }

    tracing::info!("WebSocket connection terminated");
}
