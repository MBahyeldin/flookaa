 
import type { SubscribeChannelPayload, SubscribeDefaultPayload, SubscribePersonaPayload, SubscribeCommunityPayload, SubscribeFeedPayload, SubscribeDiscoverPayload, WsEventMessage, WsMessage } from "@/types/Ws";

const WEBSOCKET_BASE_URL = import.meta.env.VITE_WEBSOCKET_BASE_URL;

if (!WEBSOCKET_BASE_URL) {
    throw new Error("WEBSOCKET_BASE_URL is not defined in environment variables");
}

export type MessageListener = (payload: WsEventMessage) => void;

export default class WebSocketService {
    private static instance: WebSocketService;

    private ws: WebSocket | null = null;
    private listeners = new Map<string, Set<MessageListener>>();
    private queuedMessages: WsMessage<any>[] = [];
    // The default subscription (the persona's direct_messages, notifications
    // and alerts). Stable, so feature code can listen to it by id.
    private readonly defaultSubscriptionId = crypto.randomUUID();

    // 🔹 Singleton accessor
    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
            WebSocketService.instance.initWebSocket();
        }
        return WebSocketService.instance;
    }

    // 🔹 Initialize WebSocket once
    private async initWebSocket() {
        await this.waitForWebSocketOpen();
        this.subscribeToDefaultChannel();
        this.flushQueuedMessages();
        this.setHeartbeat();
    }

    private async waitForWebSocketOpen(): Promise<void> {
        this.ws = new WebSocket(`${WEBSOCKET_BASE_URL}/ws`);

        return new Promise((resolve, reject) => {
            if (!this.ws) return reject(new Error("WebSocket is not initialized"));
            this.ws.onopen = () => {
                this.initListeners();
                resolve();
            };

            this.ws.onerror = (err) => {
                reject(err);
            };
        });
    }

    private flushQueuedMessages() {
        this.queuedMessages.forEach((msg) => this.sendMessage(msg));
        this.queuedMessages = [];
    }

    private setHeartbeat() {
        setInterval(() => {
            // send() throws if the socket isn't OPEN (e.g. closing/closed).
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "HEARTBEAT" }));
            }
        }, 5000);
    }

    // 🔹 Attach listeners only once
    private initListeners() {
        if (!this.ws) throw new Error("WebSocket not initialized");

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { payload, id } = message;


                // 🔹 Notify all listeners for this subject
                this.listeners.get(id)?.forEach((cb) => cb(JSON.parse(payload)));
            } catch (e) {
                console.error("Failed to parse message:", e);
            }
        };

        this.ws.onclose = () => {
            console.warn("WebSocket closed");
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    closeConnection() {
        this.ws?.close();
        this.ws = null;
    }

    // 🔹 Send message
    sendMessage<P>(message: WsMessage<P>) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queueing before the socket opens is the normal path (getInstance
            // returns while initWebSocket is still awaiting), so this isn't a
            // warning — flushQueuedMessages drains it on open.
            this.queuedMessages.push(message);
            console.debug("WebSocket not open yet. Message queued.");
        }
    }

    // 🔹 Default subscription (optional)
    subscribeToDefaultChannel() {
        const id = this.defaultSubscriptionId;

        // No-op: this subscription exists to register the default channel with
        // the server. Features listen through subscribeToDefaultEvents.
        const cb = () => {};
        this.subscribe(id, cb);

        this.sendMessage<SubscribeDefaultPayload>({
            type: "SUBSCRIBE",
            payload: { owner: "DEFAULT" },
            id: id,
        });
    }

    // 🔹 Public subscription API
    subscribe(id: string, callback: MessageListener) {
        if (!this.listeners.has(id)) {
            this.listeners.set(id, new Set());
        }

        this.listeners.get(id)!.add(callback);

        // Return unsubscribe function
        return () => {
            const set = this.listeners.get(id);
            if (set) {
                set.delete(callback);
                if (set.size === 0) this.listeners.delete(id);
            }
        };
    }

    // 🔹 Frames of the default subscription (notifications, alerts, ...).
    // The persona is fixed for the socket's life: switching persona reloads
    // the page, which opens a new socket.
    subscribeToDefaultEvents(callback: MessageListener) {
        return this.subscribe(this.defaultSubscriptionId, callback);
    }

    // 🔹 Logical wrapper for channel events
    subscribeToChannelEvents(channelId: number, callback: MessageListener) {
        const id = crypto.randomUUID();
        const payload = {
            event: "*" as const,
            event_action: "*" as const,
            owner: "CHANNEL" as const,
            owner_id: channelId,
        }
        // Tell backend to start sending messages
        this.sendMessage<SubscribeChannelPayload>({
            type: "SUBSCRIBE",
            payload,
            id,
        });

        const unsubscribe = this.subscribe(id, callback);

        // Cleanup logic
        return () => {
            unsubscribe();
            this.sendMessage({
                type: "UNSUBSCRIBE",
                payload,
                id,
            });
        };
    }

    // The server serves only the persona's follow_counts events here.
    subscribeToPersonaEvents(personaId: number, callback: MessageListener) {
        const id = crypto.randomUUID();
        const payload = { owner: "PERSONA" as const, owner_id: personaId };
        this.sendMessage<SubscribePersonaPayload>({ type: "SUBSCRIBE", payload, id });

        const unsubscribe = this.subscribe(id, callback);
        return () => {
            unsubscribe();
            this.sendMessage({ type: "UNSUBSCRIBE", payload, id });
        };
    }

    // New posts, likes and comments of every channel in the persona's feed.
    subscribeToFeedEvents(callback: MessageListener) {
        const id = crypto.randomUUID();
        const payload = { owner: "FEED" as const };
        this.sendMessage<SubscribeFeedPayload>({ type: "SUBSCRIBE", payload, id });

        const unsubscribe = this.subscribe(id, callback);
        return () => {
            unsubscribe();
            this.sendMessage({ type: "UNSUBSCRIBE", payload, id });
        };
    }

    // The same events for the channels of one Discover mode (neither = For you).
    subscribeToDiscoverEvents(mode: { interests: string[]; all: boolean }, callback: MessageListener) {
        const id = crypto.randomUUID();
        const payload = { owner: "DISCOVER" as const, ...mode };
        this.sendMessage<SubscribeDiscoverPayload>({ type: "SUBSCRIBE", payload, id });

        const unsubscribe = this.subscribe(id, callback);
        return () => {
            unsubscribe();
            this.sendMessage({ type: "UNSUBSCRIBE", payload, id });
        };
    }

    subscribeToCommunityEvents(communityId: number, callback: MessageListener) {
        const id = crypto.randomUUID();
        const payload = { owner: "COMMUNITY" as const, owner_id: communityId };
        this.sendMessage<SubscribeCommunityPayload>({ type: "SUBSCRIBE", payload, id });

        const unsubscribe = this.subscribe(id, callback);
        return () => {
            unsubscribe();
            this.sendMessage({ type: "UNSUBSCRIBE", payload, id });
        };
    }
}
