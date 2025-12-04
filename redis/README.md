This is a background workker to update redis cache
It subscribes to nats pubsub and listens for messages on the "cache.update" subject.
When a message is received, it updates the redis cache with the provided key-value pair.