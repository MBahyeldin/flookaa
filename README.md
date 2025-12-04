# 🏗️ Social Media Platform – Architecture Overview

## 🔹 1. Client (React + Apollo + REST)

- **REST API (Users & Channels)**  
  - CRUD operations for users, channels, and memberships.  
  - Backed by Postgres.  

- **GraphQL Queries & Mutations (Posts, Comments, Replies)**  
  - Over **HTTP** (Apollo Client → Go App).  
  - Flexible document querying from MongoDB.  

- **WebSocket (Single Connection)**  
  - Connects to the **Rust WS bridge**.  
  - Receives **tiny realtime events** (message IDs, notifications, typing, presence).  
  - If details are missing → fetch via REST (users/channels) or GraphQL (posts/comments).  
  - Apollo cache deduplicates GraphQL fetches.  

---

## 🔹 2. Rust WebSocket Bridge

- **Manages WebSocket connections** (async, high-concurrency).  
- **Delegates auth** → JWT validated by Go.  
- **Handles subscriptions** → works with Go + Redis to attach/detach JetStream consumers.  
- **Multiplexes events** → one WS pipe for all event types.  
- **Protocol:**

```json
{ "type": "channel_message", "channelId": "45", "messageId": "m123" }
{ "type": "dm", "from": "u123", "messageId": "d456" }
{ "type": "user_typing", "channelId": "45", "userId": "u567" }
{ "type": "notification", "kind": "new_follower", "userId": "u789" }
```

---

## 🔹 3. Go Application (Core Logic Layer)

- **REST API (Users/Channels)**  
  - Manages users, channels, memberships in Postgres.  

- **GraphQL Server (Posts/Comments/Replies)**  
  - Serves queries/mutations for MongoDB content.  

- **Subscription Management**  
  - Validates user memberships (via Postgres).  
  - Updates Redis with subscription lists and offsets.  

- **Event Publisher**  
  - On state changes, publishes to NATS JetStream:  
    - Example: `channel.45.message.created { messageId: "m123" }`.  

- **Background Workers**  
  - Consume JetStream streams for tasks like fanout, indexing, analytics.  

---

## 🔹 4. NATS + JetStream (Event Backbone)

- **Streams** (persistent logs):  
  - `DM_STREAM` → `user.*.dm`  
  - `CHANNEL_STREAM` → `channel.*.message.*`  
  - `NOTIFY_STREAM` → `user.*.notify.*`  

- **Consumers**:  
  - **Ephemeral** for channels (per-session, replay from offset).  
  - **Durable** for DMs & notifications (per-user, resume after disconnect).  

---

## 🔹 5. Redis (Fast Session + Offsets)

- Stores active subscriptions and read offsets:  
  ```text
  user:123:subs = [channel.45, channel.72]
  lastRead:user:123:channel:45 = 1023
  ```

- Used during reconnect to resume subscriptions.  
- Also caches frequently accessed user info.  

---

## 🔹 6. Databases

- **Postgres**:  
  - Relational entities (users, channels, memberships).  

- **MongoDB**:  
  - Flexible document storage (posts, comments, replies).  

---

## 🔹 7. Data Flows

### **A. Sending a Message**
1. Client sends GraphQL mutation.  
2. Go validates → writes to **MongoDB**.  
3. Go publishes event to **NATS JetStream**.  
4. JetStream persists and delivers event.  
5. Rust WS forwards small event to clients.  
6. Client fetches full message (GraphQL) if not cached.  

---

### **B. User/Channel Updates**
1. Client sends REST request (create/join channel, update profile).  
2. Go validates → writes to **Postgres**.  
3. Go publishes event to **NATS JetStream** (e.g., `user.123.updated`).  
4. Clients subscribed to affected entities get WS event.  
5. Client fetches details via REST (users/channels).  

---

### **C. Reconnect Flow**
1. Client reconnects → Rust notifies Go.  
2. Go reads Redis for `user:subs` + `lastRead`.  
3. Rust reattaches ephemeral consumers from correct offset.  
4. JetStream replays missed events → client stays consistent.  

---

### **D. Typing Indicator**
1. Client sends WS event `{ "action": "typing", "channelId": "45" }`.  
2. Rust → Go → publishes ephemeral event.  
3. Other clients in channel receive event over WS.  
4. No DB write required.  

---

## **🔹 8. key points**

- **REST for Users/Channels** → clean CRUD on relational data.  
- **GraphQL for Posts/Comments** → flexible document querying.  
- **Single WebSocket** → multiplexed realtime channel.  
- **Tiny WS events + REST/GraphQL fetch** → efficient & scalable.  
- **Redis + JetStream** → robust reconnect & replay mechanism.  
- **Go as brain**, **Rust as muscle**.  

---

## 🔹 9. Architecture Diagram (Textual)

```
React (REST + Apollo + WS)
    |    REST (users/channels)  |  GraphQL (posts/comments)   |  WebSocket
    v                           v                             v
  Go App  <------ control ------->  Rust WS Bridge
   |  \                             /
   |   \--- Publish/Subscribe ------/
   |            (events)
   v
 NATS JetStream  <----->  Redis (subs, offsets)
   |       \
   |        \--> Workers (background jobs)
   |
   +--> Postgres (users, channels)
   +--> MongoDB (posts, comments, replies)
```

---

⚡ **Summary**:  
- **REST** → users, channels, memberships (Postgres).  
- **GraphQL** → posts, comments, replies (MongoDB).  
- **WebSocket** → realtime events.  
- **Go** → core logic, API gateway, event publisher.  
- **Rust** → scalable WS handler.  
- **NATS JetStream** → reliable pub/sub.  
- **Redis** → subs + reconnect cache.  
