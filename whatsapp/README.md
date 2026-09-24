# whatsapp

Send-only WhatsApp microservice. Exposes a small authenticated REST API that
delivers text messages through [whatsmeow](https://github.com/tulir/whatsmeow),
a Go implementation of the WhatsApp Web multi-device protocol.

> **This is an unofficial client.** It logs in as a linked device, exactly like
> WhatsApp Web. That violates WhatsApp's Terms of Service and the linked number
> can be banned, permanently and without warning or appeal. Do not link a
> number you cannot afford to lose. The rate limiter below exists to reduce
> that risk, not to remove it.

## API

All routes are under `/api/v1`. Everything except `/health` requires
`Authorization: Bearer $WHATSAPP_API_TOKEN`.

### `GET /health`

Liveness only — says the process is up, not that WhatsApp is linked.
Unauthenticated.

```json
{ "status": "ok-whatsapp" }
```

### `GET /status`

The WhatsApp connection state. This is the endpoint to poll, because pairing
happens through stdout and nothing else reports a logout.

```json
{
  "connected": true,
  "logged_in": true,
  "jid": "201234567890:12@s.whatsapp.net",
  "connected_since": "2026-09-24T08:00:00Z",
  "last_event": "connected"
}
```

### `POST /messages`

```jsonc
{
  "to": "+201234567890",   // required, international format
  "text": "Your code is 123456",
  "message_id": "order-4417-confirm"  // optional, see idempotency
}
```

`201 Created`:

```json
{
  "id": "3EB0A1B2C3D4E5F6",
  "to": "201234567890@s.whatsapp.net",
  "timestamp": "2026-09-24T10:00:00Z"
}
```

| Status | Body `error` | Meaning |
|---|---|---|
| 400 | validation message | Bad JSON, missing field, or unusable phone number |
| 401 | `missing authorization header` / `invalid token` | Bad or absent bearer token |
| 422 | `not_on_whatsapp` | Number is valid but not registered on WhatsApp |
| 429 | `rate_limited` | Send rate exceeded; see `Retry-After` |
| 502 | `send_failed` | WhatsApp rejected or the send timed out |
| 503 | `not_connected` | Service is up but unpaired or reconnecting |

Numbers must be international format. `+20 123 456-7890`, `201234567890` and
`0020123456789` all normalize to `201234567890`. National format with a leading
zero is **rejected** rather than guessed, because guessing a country code wrong
sends the message to a stranger.

Every send first calls `IsOnWhatsApp`. This matters because WhatsApp does *not*
error when you send to an unregistered number — the message silently goes
nowhere — so without the check a typo'd number returns a cheerful `201`.

### Idempotency

Sends are never retried automatically; a failure returns 502 and the caller
decides. Pass a stable `message_id` to make that retry safe: WhatsApp
deduplicates by message ID, so re-sending after an ambiguous timeout cannot
deliver the message twice.

## Pairing

The session store starts empty, so the service boots **unpaired**: `/health`
returns 200, `/status` reports `logged_in: false`, and `POST /messages` returns
503. It prints a QR code to stdout and reprints it every ~20s until scanned.

```bash
journalctl -u whatsapp -f
```

Then scan from WhatsApp on the phone: **Settings → Linked devices → Link a
device**.

The same flow runs automatically after an `events.LoggedOut` (someone unlinked
the device, or it sat offline for ~14 days): the dead session is cleared and a
fresh QR starts printing. No redeploy needed — but someone does have to scan
it, so poll `/status` rather than waiting to notice.

> Service logs ship to Loki (see `ansible/templates/shared/alloy.config.yml.j2`),
> so both the pairing QR and message bodies are searchable in Grafana. The QR is
> a live device-linking credential during its 20s window.

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `WHATSAPP_API_TOKEN` | **yes** | — | Shared bearer secret. The process refuses to start without it |
| `WHATSAPP_SESSION_DB` | no | `/opt/whatsapp-data/session.db` | SQLite session store |
| `WHATSAPP_SEND_RATE` | no | `1` | Sustained sends per second |
| `WHATSAPP_SEND_BURST` | no | `5` | Burst allowance |
| `WHATSAPP_PORT` | no | `8080` | HTTP listen port |

There is no `godotenv` in this repo, so nothing loads `.env` for you:

```bash
set -a && source .env && set +a && go run .
```

## Local development

```bash
WHATSAPP_API_TOKEN=dev-token \
WHATSAPP_SESSION_DB=./session.db \
WHATSAPP_PORT=8099 \
go run .
```

```bash
curl -X POST http://127.0.0.1:8099/api/v1/messages \
  -H "Authorization: Bearer dev-token" \
  -H 'Content-Type: application/json' \
  -d '{"to":"+201234567890","text":"hello"}'
```

## Deploy

```bash
./deploy.bash     # -> gRPC@whatsapp
```

Cross-compiles `linux/amd64` and `scp`s the binary into
`/home/gRPC/watched`, where the gRPC agent copies it to
`/opt/whatsapp/<timestamp>`, flips the `current` symlink and restarts the
systemd unit. This requires a `whatsapp` host entry in your `~/.ssh/config`,
same as `s3`.

Provision the container first with `ansible/pick-and-play.bash` →
`whatsapp.playbook.yml`.

## Design notes

Things here that are deliberate, not accidental:

- **`CGO_ENABLED=0` and `modernc.org/sqlite`.** The session store uses the
  pure-Go SQLite driver. The common `mattn/go-sqlite3` is CGO-only and would
  break the macOS → `linux/amd64` cross-build in `deploy.bash`.
- **The session lives outside the versioned directory.** Every deploy creates a
  fresh `/opt/whatsapp/<timestamp>`, so a session file under the working
  directory would be orphaned on release. It goes in `/opt/whatsapp-data/`,
  created by ansible. WAL mode means `session.db-wal` and `session.db-shm`
  sidecars live there too.
- **Auth aborts instead of continuing.** The backend's `AuthMiddleware` always
  calls `c.Next()` and lets handlers decide. This service has no anonymous
  caller — an unauthenticated request could send from the linked account — so
  it aborts with 401, and compares tokens with `subtle.ConstantTimeCompare` so
  response timing doesn't leak the token prefix.
- **Internal-only, no CORS.** A static bearer token cannot safely be given to a
  browser. Frontend features go frontend → backend → whatsapp, with the backend
  doing the real per-user authorization.
- **No `shared` import.** Every `shared/external/db/*` package connects in
  `init()` and `log.Fatal`s on failure, so importing one would make this
  service require the whole platform's env just to boot.
- **Inbound events are ignored** and history sync is disabled. This is a
  send-only service; not storing other people's conversations keeps
  `session.db` small and keeps that data off this box.
