use crate::go_bridge;
use async_nats::{jetstream, jetstream::consumer::pull::Config as PullConfig, Client};
use axum::extract::ws::{Message as AxumMessage, WebSocket};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use std::{collections::HashMap, env};
use tokio::sync::Mutex;
use tokio::sync::OnceCell;

static NATS_CLIENT: OnceCell<Client> = OnceCell::const_new();

async fn get_client() -> Client {
    let url = "nats://127.0.0.1:4222".to_string();
    NATS_CLIENT
        .get_or_init(|| async { async_nats::connect(&url).await.expect("failed to connect") })
        .await
        .clone()
}

/// Subscribe to a regular NATS subject (fire-and-forget pub/sub)
pub async fn subscribe(subject: &str) -> futures::stream::BoxStream<'static, String> {
    let client = get_client().await;
    let sub = match client.subscribe(subject.to_string()).await {
        Ok(s) => s,
        Err(_) => return futures::stream::empty().boxed(),
    };

    sub.filter_map(|msg| async move { String::from_utf8(msg.payload.to_vec()).ok() })
        .boxed()
}

pub async fn create_ephemeral_consumer(
    subjects: Vec<go_bridge::Subject>,
    sender: Arc<Mutex<SplitSink<WebSocket, AxumMessage>>>,
    id: String,
) {
    let client = get_client().await;
    let js = jetstream::new(client);

    // Group subjects by user prefix: "user:1:..."
    let mut grouped: HashMap<String, Vec<String>> = HashMap::new();

    for s in &subjects {
        if let Some((stream_name, _)) = s.subject.split_once(".") {
            grouped
                .entry(stream_name.to_string())
                .or_default()
                .push(s.subject.clone());
        }
    }

    for (stream_name, user_subjects) in grouped {
        if stream_name.is_empty() {
            println!("Empty stream name Skipping subjects: {:?}", user_subjects);
            continue;
        }

        // Try to get or create a shared stream for all user subjects
        let stream = match js.get_stream(&stream_name).await {
            Ok(stream) => {
                println!("Found existing stream: {}", stream_name);
                stream
            }

            // Stream doesn’t exist yet — create it
            Err(err) => {
                println!("Failed to get stream for {}: {:?}", stream_name, err);
                continue;
            }
        };

        for subject_name in user_subjects {
            // Ephemeral consumer starting from the beginning
            let consumer = match stream
                .create_consumer(PullConfig {
                    durable_name: None,
                    ack_policy: jetstream::consumer::AckPolicy::None,
                    deliver_policy: jetstream::consumer::DeliverPolicy::All,
                    filter_subject: subject_name.clone(),
                    ..Default::default()
                })
                .await
            {
                Ok(c) => c,
                Err(err) => {
                    eprintln!("Failed to create consumer for {}: {:?}", subject_name, err);
                    continue;
                }
            };

            let mut consumer_cloned = consumer.clone();

            let info = consumer_cloned
                .info()
                .await
                .expect("Failed to get consumer info");
            println!(
                "Created ephemeral consumer for {} on stream {} (pending: {}, ack floor: {})",
                subject_name, stream_name, info.num_pending, info.ack_floor.consumer_sequence
            );

            let mut messages = consumer
                .messages()
                .await
                .expect("Failed to get consumer messages stream");

            let mut pending_counter;
            if info.num_pending > 0 {
                pending_counter = info.num_pending;
            } else {
                println!("No pending messages for {}, exiting", subject_name);
                continue;
            }

            println!("Reading messages for subject: {}", subject_name);
            let sender_clone = sender.clone();
            let id = id.clone();

            tokio::spawn(async move {
                println!("Reading messages for subject: {}", subject_name);
                // if no messages for subject_name, abort the consumer and exit the task
                while let Some(Ok(msg)) = messages.next().await {
                    if let Ok(payload) = String::from_utf8(msg.message.payload.to_vec()) {
                        let mut guard = sender_clone.lock().await;
                        let outgoing_msg = go_bridge::OutgoingMessage {
                            subject: subject_name.clone(),
                            payload,
                            id: id.clone(),
                        };
                        let outgoing_msg_text = serde_json::to_string(&outgoing_msg).unwrap();
                        if let Err(err) = guard.send(AxumMessage::Text(outgoing_msg_text)).await {
                            eprintln!("Failed to send WS message for {}: {:?}", subject_name, err);
                            break;
                        }
                        pending_counter = pending_counter.saturating_sub(1);
                        if pending_counter == 0 {
                            println!("No more pending messages for {}, exiting", subject_name);
                            break;
                        }
                    }
                }

                println!("Finished reading stream for {}", subject_name);
            });
        }
        println!("Finished reading stream for {}", stream_name);
    }
}
