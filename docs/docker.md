# Docker

The current model is **build locally, run on the host**. There is no published image and no shipped `docker-compose.yml` — the [`Dockerfile`](../Dockerfile) is the unit of distribution. The host's Compose file lives next to the checkout and is excluded from git via [`.gitignore`](../.gitignore) (`compose.*.yml`, `docker-compose.*.yml`); operators are expected to write their own.

## What the image contains

`node:22.22-alpine` plus the build toolchain Alpine needs for native deps (`python3`, `make`, `g++`). `corepack` activates the pnpm version pinned in `package.json`. Source is copied in, `pnpm install --frozen-lockfile` runs at build time. The container starts with `pnpm start`.

Inside the container, `/app/data` is a symlink to `/data`. Mount a host directory at `/data` and the bot's runtime data (notably `data/plugins.ts`, the per-guild config, any other state) is preserved across rebuilds.

The image exposes port 8443.

## Build

```sh
docker build -t sir-clive-sinclairbot .
```

The build context honours [`.dockerignore`](../.dockerignore) — `node_modules`, `dist`, `.git`, the host-side `data/`, `docs/`, `test/`, `.env*`, and any `compose.*` / `docker-compose.*` files are excluded so they don't tank the cache or leak secrets into the image.

`pnpm install --frozen-lockfile` will fail if `pnpm-lock.yaml` is out of date — run `pnpm install` on the host first if you've just changed dependencies.

## Run

The bot needs:

1. An `.env` file (operator copies one from your secrets store; not baked into the image).
2. A reachable Redis at `CACHE_URL`.
3. A `/data` mount with at least `plugins.ts` in it (the same file you maintain at `data/plugins.ts` in the repo). The `data/plugins.ts.example` and `data/guilds.js.example` are starting points.
4. Port 8443 reachable from wherever you front it (reverse proxy, tunnel, etc.).

Minimal invocation:

```sh
docker run --rm \
    --name scs-bot \
    --env-file ./.env \
    -p 8443:8443 \
    -v "$(pwd)/data:/data" \
    sir-clive-sinclairbot
```

`--rm` discards the container on exit; persistent state lives in the `/data` mount and in Redis.

### Same thing as Compose

Most operators run with a host-side Compose file. A working starting point — drop alongside the checkout as `compose.yml` (gitignored):

```yaml
services:
  bot:
    build: .
    image: sir-clive-sinclairbot
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./data:/data
    ports:
      - "8443:8443"

  redis:
    image: redis/redis-stack-server:latest
    restart: unless-stopped
    volumes:
      - ./redis:/data
```

Then `docker compose up -d --build`. With Redis as a sidecar like this, set `CACHE_URL=redis://redis:6379/0` in `.env` — service-name DNS works inside the stack and you don't need the bridge-gateway dance described below.

The bot uses RedisJSON (`JSON.SET` / `JSON.GET`), which is why the image is `redis-stack-server` rather than vanilla `redis`.

## Redis

Redis is required (the env's `CACHE_URL` must resolve to a working instance — `redis://host:6379/<db>`). The bot does not run Redis for you. Two common shapes:

- **Redis on the same host, host networking.** Add `--network host` to the run line (drops the `-p` mapping; the container shares the host network namespace) and point `CACHE_URL=redis://127.0.0.1:6379/0`. macOS doesn't honour `--network host`; use the bridge approach there.
- **Redis on the same host, bridge networking.** On Linux, the container can reach the host at `172.17.0.1` (the docker bridge gateway). Set `CACHE_URL=redis://172.17.0.1:6379/0`.

If you're going to run multiple stacks on one host, keep each stack on its own network and reach across via the bridge gateway rather than joining stacks together — coupled networks make plugin upgrades harder to reason about.

## Reverse proxy

The bot speaks plain HTTP on 8443. OAuth callbacks need HTTPS (the OIDC config sets `callbackURL` from `HOSTNAME`), so terminate TLS at a reverse proxy and forward to 8443. Set `HOSTNAME` to the public hostname the proxy uses. The session cookie is `secure: true` and `app.set('trust proxy', 1)` is configured in `src/bot.ts`, so the standard `X-Forwarded-Proto` flow works.

## Env file

Use `env.sample` as a structural reference, but it is currently shorter than the live core schema. The full set of variables — including the OIDC group, `HOSTNAME`, and any plugin-declared vars like `RELAY_SIGNING_KEY` — is documented in [`env.txt`](env.txt). The bot exits at startup if a required var is missing and logs which one.

A plugin's required env vars are validated centrally before any plugin is constructed: a missing `RELAY_SIGNING_KEY` while `org.xalior.relay` is in [`data/plugins.ts`](../data/plugins.ts) terminates startup with a clear message naming the missing key. Removing the plugin from the list removes the requirement.

## Logs

`pnpm start` writes everything to stdout/stderr. Stream with `docker logs -f scs-bot`. There is no on-disk log file inside the image.

## Upgrading

Because runtime data lives in the `/data` mount and not in the image, the upgrade loop is:

```sh
git pull
docker build -t sir-clive-sinclairbot .
docker stop scs-bot
docker run … sir-clive-sinclairbot   # same args as before
```

Plugin enablement / disablement is a `data/plugins.ts` edit followed by a restart — no rebuild required if `data/` is mounted.
