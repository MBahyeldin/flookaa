# WWW-126 — Logo and cover URLs accept any host

`backend/internal/logo.Valid` checks only the path, so `https://evil.com/files/abc` passes as a logo or cover on channels and communities. The image would load in every visitor's browser, so that host learns their IP addresses, which works against anonymous personas. Backend only.

## Change

- `logo.Valid(base, s)`: `""` or `s3url.File(base, s)`, the exact-origin rule from WWW-111. `ValidPosition` and `NullPosition` stay as they are.
- `channels.Handler` and `communities.Handler` get `s3BaseURL` as a constructor parameter, passed `cfg.S3BaseURL` in `backend/cmd/server/root.go`.
- `checkLook` and `lookError` become methods, or take the base, so they can use it. They cover `thumbnail` and `banner` on create and `PATCH`.
- Error codes don't change: `invalid_logo`, `invalid_cover`. The frontend already handles them.
- The seeder sets no URLs, so it's unaffected.

## Decisions

1. **A bare `/files/<key>` path is refused from now on.** The frontend always sends the full s3 URL, and WWW-111 refuses bare paths too. The WWW-80 rule only allowed them for an empty `VITE_S3_BUCKET_BASE_URL`, which no environment has.
2. **Stored values aren't rewritten and keep displaying.** The check runs only on values a request sends. The manage sheets and settings send only changed fields, so saving another field never fails on an old value.

## Before deploying

Look for existing values the new rule wouldn't accept again:

```sql
SELECT 'channels', id, thumbnail, banner FROM channels
WHERE (thumbnail <> '' AND thumbnail !~ '^https://s3\.flookaa\.com/files/[A-Za-z0-9-]+$')
   OR (banner <> '' AND banner !~ '^https://s3\.flookaa\.com/files/[A-Za-z0-9-]+$')
UNION ALL
SELECT 'communities', id, thumbnail, banner FROM communities
WHERE (thumbnail <> '' AND thumbnail !~ '^https://s3\.flookaa\.com/files/[A-Za-z0-9-]+$')
   OR (banner <> '' AND banner !~ '^https://s3\.flookaa\.com/files/[A-Za-z0-9-]+$');
```

## Docs

`CLAUDE.md`, the **Look** paragraph: logos and covers must be on the `S3_BASE_URL` origin.

## Checks

No automated tests in this repo. `go build`, then on a deployed backend, on channel and community create and `PATCH`:

- `https://evil.com/files/abc`, a lookalike host and a bare `/files/abc` are refused, for both logo and cover.
- A real upload through the forms still saves.
- `""` still removes a logo or cover.
- Saving another field on a row that holds an old value still works.

## Out of scope

Other image fields with the same gap; see the note on the ticket.
