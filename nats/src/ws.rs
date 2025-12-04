use axum::{
    extract::WebSocketUpgrade,
    extract::ws::{Message, WebSocket},
    extract::TypedHeader,
    headers::Cookie,
    response::IntoResponse,
};
use futures::{StreamExt};
use crate::{go_bridge};
use std::sync::Arc;
use tokio::{sync::{Mutex, watch}, task::JoinHandle};
use std::collections::HashMap;
type Subscriptions = Arc<Mutex<HashMap<String, JoinHandle<()>>>>;


pub async fn ws_handler(
    ws: WebSocketUpgrade,
    TypedHeader(cookies): TypedHeader<Cookie>,
) -> impl IntoResponse {
    let cookie_string = cookies
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("; ");

    ws.on_upgrade(|socket| async move {
        handle_socket(socket, cookie_string).await;
    })
}

async fn handle_socket(socket: WebSocket, cookie_header: String) {
    let client_id = uuid::Uuid::new_v4();
    // split into sink and stream
    let (sender, mut receiver) = socket.split();
    // wrap sink so it can be shared across tasks
    let sender = Arc::new(Mutex::new(sender));
    // Channel to signal shutdown
    let (shutdown_tx, shutdown_rx) = watch::channel::<bool>(false);
    let subscriptions: Subscriptions = Arc::new(Mutex::new(HashMap::new()));

    // WebSocket -> Go
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            // pass a clone of the Arc<Mutex<...>>
            go_bridge::forward_to_go(&text, &cookie_header, sender.clone(), shutdown_rx.clone(), subscriptions.clone()).await;
        }
    }

    let _ = shutdown_tx.send(true);


    tracing::info!("Client {} disconnected", client_id);
}
