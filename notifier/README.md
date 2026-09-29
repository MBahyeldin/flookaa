# notifier

Turns content and channel events into per-persona notifications.

It runs two durable JetStream pull consumers:

| Consumer | Stream | Handles |
|---|---|---|
| `notifier-content` | `STREAM_CONTENT_EVENTS` | `comment.create`, `like.create` / `like.delete`, `post.delete`, `comment.delete` |
| `notifier-channel` | `STREAM_CHANNEL_EVENTS` | `join_request.create` / `.delete`, `member.create` (approved), `member.delete` (removed) |

For each event it upserts rows in the Postgres `notifications` table (one row
per recipient and thing, `UNIQUE (recipient_id, group_key)`). Then it publishes
`STREAM_USER_EVENTS.PERSONA.<recipient>.notifications.{create|delete}` with the
notification id. Browsers get that frame through the websocket proxy and
refetch over REST.

- **No running totals.** Removal events (unlike, deleted comment, resolved
  join request) recount the group from `events` / `channel_members`. The rows
  are soft-deleted only when nobody but the recipient is left.
- **Replay-safe.** Each row keeps the time of the newest event applied. An
  older or repeated event changes nothing and publishes nothing.
- **Starts at new events** on first deploy (`DeliverNew`). After that the
  durable consumers resume where they stopped.
- Nobody is notified about their own activity.

## Environment

| Var | |
|---|---|
| `DATABASE_DSN` | Postgres with migration 012 applied |
| `NATS_CONNECTION` | NATS; the streams must exist (the backend creates them) |

## Deploy

```bash
./deploy.bash   # linux/amd64 build, scp to gRPC@notifier:/home/gRPC/watched
```

The container is provisioned by `ansible/notifier.playbook.yml`.
