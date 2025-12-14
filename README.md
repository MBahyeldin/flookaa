# 🏗️ Social Media Platform -- Architecture Overview

## 🔹 1. Client (React + Apollo + REST)

### Frontend Stack

-   **React (Frontend Framework)**
    -   Component-based UI architecture.
    -   Optimized for large-scale, interactive applications.
-   **Apollo Client (GraphQL)**
    -   Handles GraphQL queries, mutations, and caching.
    -   Integrated with React via hooks.
    -   Uses normalized cache to reduce redundant network requests.
-   **GraphQL Code Generation**
    -   Automatically generates **TypeScript types** and **React hooks**
        from GraphQL schema and operations.
    -   Ensures **type safety** across frontend and backend boundaries.
    -   Improves developer productivity and reduces runtime errors.
-   **Zustand (State Management)**
    -   Lightweight global state management for UI and client-only
        state.
    -   Used for:
        -   UI preferences
        -   Temporary client-side data not suited for GraphQL cache
    -   Complements Apollo cache rather than replacing it.

### Data Access

-   **REST API (Users & Channels)**
    -   CRUD operations for users, channels, and memberships.
    -   Backed by Postgres.
-   **GraphQL Queries & Mutations (Posts, Comments, Replies)**
    -   Over **HTTP** (Apollo Client → Go App).
    -   Flexible document querying from MongoDB.
    -   Fully typed via code generation.
-   **WebSocket (Single Connection)**
    -   Connects to the **Rust WS bridge**.
    -   Receives **tiny realtime events** (message IDs, notifications,
        typing, presence).
    -   If details are missing → fetch via REST (users/channels) or
        GraphQL (posts/comments).
    -   Apollo cache deduplicates GraphQL fetches.

------------------------------------------------------------------------

## 🔹 2. Rust WebSocket Bridge

-   **Manages WebSocket connections** (async, high-concurrency).
-   **Delegates auth** → JWT validated by Go.
-   **Handles subscriptions** → works with Go + Redis to attach/detach
    JetStream consumers.
-   **Multiplexes events** → one WS pipe for all event types.

**Protocol examples:**

``` json
{ "type": "channel_message", "channelId": "45", "messageId": "m123" }
{ "type": "dm", "from": "u123", "messageId": "d456" }
{ "type": "user_typing", "channelId": "45", "userId": "u567" }
{ "type": "notification", "kind": "new_follower", "userId": "u789" }
```

------------------------------------------------------------------------

## 🔹 3. Go Application (Core Logic Layer)

-   **REST API (Users/Channels)**
    -   Manages users, channels, memberships in Postgres.
-   **GraphQL Server (Posts/Comments/Replies)**
    -   Serves queries/mutations for MongoDB content.
-   **Subscription Management**
    -   Validates user memberships (via Postgres).
    -   Updates Redis with subscription lists and offsets.
-   **Event Publisher**
    -   Publishes state changes to NATS JetStream.
-   **Background Workers**
    -   Consume JetStream streams for fanout, indexing, analytics.

------------------------------------------------------------------------

## 🔹 4. NATS + JetStream (Event Backbone)

-   **Streams (persistent logs)**:
    -   `DM_STREAM` → `user.*.dm`
    -   `CHANNEL_STREAM` → `channel.*.message.*`
    -   `NOTIFY_STREAM` → `user.*.notify.*`
-   **Consumers**:
    -   **Ephemeral** → channels (per-session).
    -   **Durable** → DMs & notifications (per-user).

------------------------------------------------------------------------

## 🔹 5. Redis (Fast Session + Offsets)

``` text
user:123:subs = [channel.45, channel.72]
lastRead:user:123:channel:45 = 1023
```

-   Used for reconnect and caching hot user data.

------------------------------------------------------------------------

## 🔹 6. Databases

-   **Postgres** → users, channels, memberships.
-   **MongoDB** → posts, comments, replies.

------------------------------------------------------------------------

## 🔹 7. Infrastructure & Deployment (LXD-based)

-   LXD / LXC containerization
-   Isolated services
-   Bridge networking
-   Controlled port exposure

------------------------------------------------------------------------

## 🔹 8. Configuration Management (Ansible)

-   Host provisioning
-   LXD & bridge setup
-   Container lifecycle
-   Service configuration
-   systemd deployment

------------------------------------------------------------------------

## 🔹 9. Observability & Monitoring

-   **Prometheus** for metrics
-   **Grafana Alloy** for systemd & logs
-   **Grafana** dashboards for ops & capacity planning

------------------------------------------------------------------------

## 🔹 10. End-to-End Topology

    Internet
       |
    Host
       |
    LXD Bridge
     |    |    |
    Go   WS   NATS
     |    |
    DB   Redis

------------------------------------------------------------------------

## 🔹 11. Key Infrastructure Benefits

-   Strong isolation
-   Low overhead
-   High observability
-   Declarative operations
-   Type-safe frontend with GraphQL codegen
-   Scalable realtime architecture

------------------------------------------------------------------------

⚡ **Final Summary**

A resilient, scalable, type-safe realtime social platform using
**React + Apollo Client + GraphQL Codegen + Zustand** on the frontend,
powered by Rust, Go, NATS JetStream, and LXD on the backend.
