# GDG Ostim Tech

Bun workspaces monorepo. Phase 1 adds the private administration foundation;
the public landing page and community links retain their current content.

| Directory | Purpose |
| --- | --- |
| `app/` | Existing React / TanStack Start website, including `/admin` |
| `api/` | Node.js 24 + Express API, SQLite via better-sqlite3 |
| `app/packages/` | Existing vendored frontend libraries |
| `.data/` | Local database, uploads and backups; ignored by Git |

## Local setup

Requirements: Node.js **24 LTS**, Bun **1.4.3**. Bun manages packages and scripts;
the API runs on **Node**, including better-sqlite3's native module.

From the repository root:

```sh
bun install --frozen-lockfile
bun run admin:setup
```

`admin:setup` interactively asks for a username and a hidden password (12–128
characters). No default account or password exists. It can also replace the
single administrator after confirmation; doing so revokes every existing session.
There is no public registration or password-reset endpoint.

Run in two terminals:

```sh
bun run dev:api
bun run dev:web
```

Open **http://127.0.0.1:5173/admin**. Use this exact host, not `localhost`:
the API checks the configured origin for every mutation. Vite proxies `/api`
to `127.0.0.1:3001`. Optional configuration belongs in `api/.env` (copy
`api/.env.example`). Changing the API port also requires updating the Vite proxy.

## Checks

```sh
bun run typecheck
bun run test
bun run build
```

For a static nginx build, set `STATIC_EXPORT=1` when running `bun run build`.
This prerenders `/`, `/links` and the public login shell at `/admin`.
Private data is fetched only after browser session verification. The API
compiles to `api/dist/`; the web output remains in `app/dist/client/`.

CI installs from the root lockfile and validates both workspaces. It has no
deployment step. Use the root `bun.lock`; do not create a separate workspace lockfile.

## API contract

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | Database health, no private information |
| POST | `/api/auth/login` | `{ username, password }` → session cookie and admin username |
| POST | `/api/auth/logout` | Revokes session and clears cookie |
| GET | `/api/admin/session` | Admin username or HTTP 401 |
| GET | `/api/links` | Public `/links` cards in display order |
| GET | `/api/admin/links` | Same list with positions (admin) |
| POST | `/api/admin/links` | `{ title, url, icon, note }` → new card at the end |
| PUT | `/api/admin/links/:id` | Replace a card's fields |
| DELETE | `/api/admin/links/:id` | Remove a card; positions are renumbered |
| POST | `/api/admin/links/:id/move` | `{ direction: "up" \| "down" }` swaps with the neighbour |

Link addresses accept `https://`/`http://`, e-mail (stored as `mailto:`) or a same-site path
such as `/`. Icons come from a fixed list shared by `api/src/links.ts` and `app/src/lib/social.tsx`.
Schema changes are append-only entries in `api/src/database.ts`.

Write requests require the exact `APP_ORIGIN` header. API responses use
`Cache-Control: no-store`. Sessions have an absolute eight-hour expiry, use
HttpOnly + SameSite=Strict cookies (also Secure and `__Host-` in production),
and only their SHA-256 hashes are stored in SQLite. Passwords use salted scrypt.
Login attempts are limited in SQLite to 10 per IP and 50 total per 15 minutes;
the counters survive restarts. Proxy headers are ignored by default.
Future private endpoints must be mounted below the `/api/admin` authentication
guard in `api/src/app.ts`.

## Persistence and future deployment

**Phase 1 does not deploy anything.** When the final release is ready:

- Run the API as a persistent Node service bound to loopback. Route `/api/`
  through the same-origin nginx host; static web files continue to use nginx.
- Set `NODE_ENV=production`, `APP_ORIGIN=https://gdgostimtech.com` and an
  absolute `DATA_DIR` outside the release/web root, e.g. `/var/lib/gdg-landing`.
  The service fails at startup if the required production settings are absent.
- If setting `TRUST_PROXY=true`, nginx must overwrite `X-Forwarded-For` with
  `$remote_addr`. Only the loopback proxy is trusted. Do not expose the API port.
- Run `admin:setup` under the same service account and DATA_DIR. Do not copy
  development credentials into production.
- Keep DATA_DIR private to the service account. It contains `gdg.sqlite`,
  SQLite WAL files, `uploads/` and `backups/`. Never place it in a public root.
- `bun run db:backup` (production: `node dist/backup.js`) writes
  `backups/<timestamp>/` with `gdg.sqlite`, taken through SQLite's online backup
  API while the API keeps running, and a copy of `uploads/`. Do not copy just the
  live `.sqlite` file while WAL writes may be pending. Store backups off-server.
- Server templates live in `deploy/server/`: `gdg-api.service` (systemd, with
  `DATA_DIR=/var/lib/gdg-landing` outside the release directory),
  `nginx-api.conf` (same-origin `/api/` proxy + uncached `/admin/` shell) and
  `backup.cron` (nightly backup).

To restore: stop the API, preserve the current data directory, create a fresh
data directory from one backup folder (its `gdg.sqlite` and `uploads/`), set ownership/permissions, then start against that directory.
Never mix a restored database with old `-wal` or `-shm` files. Existing sessions
in a restored backup should be revoked by running `admin:setup`.

## Scope

Phase 1: workspace setup, schema migrations, administrator bootstrap/login/logout,
session protection, persistent storage, database + uploads backup and the
mascot-led admin login/dashboard.

Phase 2: `/links` cards are stored in SQLite (seeded with the previous cards) and
managed from the panel's Links screen; the page prerenders the seed and then
shows the live list from `/api/links`. Link CRUD, social
settings and event management are deliberately left for their own phases.
