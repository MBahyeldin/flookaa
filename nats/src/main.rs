mod ws;
mod nats;
mod go_bridge;

use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/ws", get(ws::ws_handler));

    let addr = "0.0.0.0:8080".parse().unwrap();
    tracing::info!("Starting WS proxy at {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
