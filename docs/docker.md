# Docker

You build the image locally and run it on the host. There is no published image and the repo has no `docker-compose.yml`. The project distributes the [`Dockerfile`](../Dockerfile) only. You write your own Compose file and keep it next to the checkout. [`.gitignore`](../.gitignore) excludes it from git (`compose.yml`, `compose.*.yml`, `docker-compose.yml`, `docker-compose.*.yml`).

## What the image contains

The base is `node:22.22-alpine`, plus the build tools that Alpine needs for native dependencies (`python3`, `make`, `g++`). `corepack` activates the pnpm version pinned in `package.json`. The build runs `pnpm install --frozen-lockfile` and copies in the source. The container starts with `pnpm start`.

Inside the container, `/app/data` is a symlink to `/data`. Mount a host directory at `/data` to keep the bot's runtime data across rebuilds. This data includes `data/plugins.ts`, the per-guild config and any other state.

The `org.xalior.claudebot` plugin sets `CLAUDE_CONFIG_DIR` to `/app/data/claude` for Claude Code, so its session transcripts are in `/data/claude` in the mount. Claude Code deletes them after 10 days.

The image exposes port 8443.

## Build

```sh
docker build -t sir-clive-sinclairbot .
```

[`.dockerignore`](../.dockerignore) excludes `node_modules`, `dist`, `.git`, the host-side `data/`, `docs/`, `test/`, `.env*`, and any `compose.*` / `docker-compose.*` files from the build context. This keeps the build cache valid and keeps secrets out of the image.

`pnpm install --frozen-lockfile` fails if `pnpm-lock.yaml` is out of date. If you changed dependencies, run `pnpm install` on the host first.

## Run

The bot needs these things:

1. An `.env` file. Copy it from your secrets store. The image does not contain it.
2. A reachable Redis at `CACHE_URL`.
3. A `/data` mount that contains at least `plugins.ts`. This is the same file as `data/plugins.ts` in the repo. Start from `data/plugins.ts.example` and `data/guilds.js.example`.
4. Port 8443, reachable from your reverse proxy, tunnel or other front end.

Minimal invocation:

```sh
docker run --rm \
    --name scs-bot \
    --env-file ./.env \
    -p 8443:8443 \
    -v "$(pwd)/data:/data" \
    sir-clive-sinclairbot
```

`--rm` removes the container when it exits. Persistent state is in the `/data` mount and in Redis.

### The same setup with Compose

Most operators use a Compose file on the host. You can start from this example. Save it next to the checkout as `compose.yml`, which git ignores.

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

Then run `docker compose up -d --build`. With Redis in the same stack, set `CACHE_URL=redis://redis:6379/0` in `.env`. The service name resolves inside the stack, so you do not need the bridge gateway address from the next section.

The bot uses RedisJSON (`JSON.SET` / `JSON.GET`). For this reason the Redis image is `redis-stack-server`, not the standard `redis` image.

## Redis

The bot needs Redis. `CACHE_URL` must point to a working instance, in the form `redis://host:6379/<db>`. The bot does not start Redis for you. If Redis runs on the same host, use one of these setups:

- **Host networking.** Add `--network host` to the run command and remove the `-p` option. The container then shares the host's network namespace. Set `CACHE_URL=redis://127.0.0.1:6379/0`. `--network host` does not work on macOS, so use bridge networking there.
- **Bridge networking.** On Linux, the container can reach the host at `172.17.0.1`, the Docker bridge gateway. Set `CACHE_URL=redis://172.17.0.1:6379/0`.

If you run more than one stack on a host, give each stack its own network. Connect stacks through the bridge gateway, not by joining their networks. Joined networks make plugin upgrades harder to understand.

## Reverse proxy

The bot serves plain HTTP on port 8443. OAuth callbacks need HTTPS, because the OIDC config sets `callbackURL` to `https://<HOSTNAME>/callback`. Terminate TLS at a reverse proxy and forward to port 8443. Set `HOSTNAME` to the public hostname of the proxy. `src/bot.ts` sets the session cookie to `secure: true` and calls `app.set('trust proxy', 1)`, so the standard `X-Forwarded-Proto` header works.

## Env file

`env.sample` shows the file format, but it does not contain every variable in the core schema. [`env.txt`](env.txt) lists all of them, including the OIDC variables, `HOSTNAME`, and plugin vars such as `RELAY_SIGNING_KEY`. If a required var is missing, the bot logs which one and exits at startup.

Core validates the env vars of all plugins before it constructs any plugin. For example, if `org.xalior.relay` is in [`data/plugins.ts`](../data/plugins.ts) and `RELAY_SIGNING_KEY` is missing, startup stops with a message that names the missing key. In the same way, `org.xalior.claudebot` needs `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`. If you remove the plugin from the list, the requirement goes away.

## Logs

`pnpm start` writes all output to stdout and stderr. To follow it, run `docker logs -f scs-bot`. The image writes no log file to disk.

## Upgrading

Runtime data is in the `/data` mount, not in the image. To upgrade, run:

```sh
git pull
docker build -t sir-clive-sinclairbot .
docker stop scs-bot
docker run … sir-clive-sinclairbot   # same args as before
```

To turn a plugin on or off, edit `data/plugins.ts` and restart the container. If `data/` is mounted, you do not need to rebuild.
