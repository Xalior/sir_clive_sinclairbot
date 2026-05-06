FROM node:22.22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN corepack prepare --activate
RUN pnpm install --frozen-lockfile

COPY . .

RUN ln -sfn /data /app/data

EXPOSE 8443

CMD ["pnpm", "start"]
