use crate::nats;
use axum::extract::ws::{Message, WebSocket};
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt};
use reqwest::Client;
use std::{collections::HashMap, env, sync::Arc};
use tokio::{
    sync::{watch, Mutex},
    task::JoinHandle,
};

type Subscriptions = Arc<Mutex<HashMap<String, JoinHandle<()>>>>;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct GoRequest {
    id: String,
}

#[derive(Debug, Deserialize)]
struct GoResponse {
    action: String,
    subjects: Vec<Subject>,
    durable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct Subject {
    pub subject: String,
    pub offset: u64,
}

#[derive(Debug, Serialize)]
pub struct OutgoingMessage {
    pub subject: String,
    pub payload: String,
    pub id: String,
}

pub async fn forward_to_go(
    payload: &str,
    cookie_header: &str,
    sender: Arc<Mutex<SplitSink<WebSocket, Message>>>,
    shutdown_rx: watch::Receiver<bool>,
    subscriptions: Subscriptions,
) {
    let url =
        env::var("GO_APP_URL").unwrap_or_else(|_| "http://10.0.0.30:8080/control".to_string());

    println!("Forwarding to Go app with cookies: {}", cookie_header);

    let payload_parsed: GoRequest = match serde_json::from_str(payload) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to parse incoming payload as JSON: {}", e);
            return;
        }
    };

    let id = payload_parsed.id.clone();

    let client = Client::new();
    match client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Cookie", cookie_header)
        .body(payload.to_string())
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();

            match resp.text().await {
                Ok(text) => {
                    println!("Response Status: {}", status);
                    println!("Response Headers: {:?}", headers);
                    println!("Response Body: {}", text);
                    if status.is_success() {
                        match serde_json::from_str::<GoResponse>(&text) {
                            Ok(go_resp) => {
                                println!("Parsed Go response: {:?}", go_resp);
                                match go_resp.action.as_str() {
                                    "subscribe" => {
                                        let subjects_array: Vec<Subject> = go_resp.subjects;
                                        subscribe_subject(
                                            subjects_array,
                                            go_resp.durable,
                                            sender.clone(),
                                            shutdown_rx.clone(),
                                            subscriptions.clone(),
                                            id.clone(),
                                        )
                                        .await;
                                    }
                                    "unsubscribe" => {
                                        let subjects_array: Vec<Subject> = go_resp.subjects;
                                        unsubscribe_subject(subjects_array, subscriptions.clone())
                                            .await;
                                    }
                                    _ => {
                                        eprintln!("Unknown action from Go app: {}", go_resp.action)
                                    }
                                }
                            }
                            Err(e) => eprintln!("Failed to parse Go response JSON: {}", e),
                        }
                    } else {
                        eprintln!("Go app returned error status: {}", status);
                    }
                }
                Err(e) => eprintln!("Failed to read response body: {}", e),
            }
        }
        Err(e) => eprintln!("Failed to send to Go app: {}", e),
    }
}

async fn subscribe_subject(
    subjects_array: Vec<Subject>,
    durable: Option<bool>,
    sender: Arc<Mutex<SplitSink<WebSocket, Message>>>,
    shutdown_rx: watch::Receiver<bool>,
    subscriptions: Subscriptions,
    id: String,
) {
    let mut cloned_subjects: Vec<Subject> = vec![];
    let mut cloned_local_subjects: Vec<Subject> = vec![];
    for subject in &subjects_array {
        cloned_subjects.push(Subject {
            subject: subject.subject.clone(),
            offset: subject.offset,
        });
        cloned_local_subjects.push(Subject {
            subject: subject.subject.clone(),
            offset: subject.offset,
        });
    }
    let id_cloned = id.clone();
    if durable.unwrap_or(false) {
        let sender_clone = sender.clone();
        tokio::spawn(async move {
            nats::create_ephemeral_consumer(cloned_subjects, sender_clone, id_cloned).await;
        });
    }

    for subject_owned in cloned_local_subjects {
        // Avoid duplicate subscriptions
        if subscriptions
            .lock()
            .await
            .contains_key(&subject_owned.subject)
        {
            println!("Already subscribed to subject: {}", &subject_owned.subject);
            continue;
        }

        println!("Subscribing to subject: {}", &subject_owned.subject);

        let mut sub = nats::subscribe(&subject_owned.subject).await;
        let sender_clone = sender.clone();
        let mut shutdown_rx = shutdown_rx.clone();
        let subject_clone = subject_owned.subject.clone();
        let id_cloned = id.clone();

        let handle: JoinHandle<()> = tokio::spawn(async move {
            while let Some(msg) = tokio::select! {
                msg = sub.next() => msg,
                _ = shutdown_rx.changed() => {
                    println!("GC: Unsubscribing from {}", &subject_clone);
                    None
                }
            } {
                println!("Received message on {}: {}", &subject_clone, msg);

                let outgoing_msg = OutgoingMessage {
                    subject: subject_clone.clone(),
                    payload: msg.clone(),
                    id: id_cloned.clone(),
                };

                // Serialize struct to JSON string
                let json_msg = serde_json::to_string(&outgoing_msg).unwrap();

                let mut guard = sender_clone.lock().await;
                if guard.send(Message::Text(json_msg)).await.is_err() {
                    println!("Socket closed, unsubscribing {}", &subject_clone);
                    break;
                }
            }
        });

        subscriptions
            .lock()
            .await
            .insert(subject_owned.subject, handle);
    }
}

async fn unsubscribe_subject(subjects_array: Vec<Subject>, subscriptions: Subscriptions) {
    for subject_owned in subjects_array {
        println!("Unsubscribing from subject: {}", &subject_owned.subject);

        if let Some(handle) = subscriptions.lock().await.remove(&subject_owned.subject) {
            handle.abort(); // Stop the subscription task
            println!("Unsubscribed from {}", &subject_owned.subject);
        } else {
            println!(
                "No active subscription found for {}",
                &subject_owned.subject
            );
        }
    }
}
