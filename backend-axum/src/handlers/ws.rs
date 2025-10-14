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
