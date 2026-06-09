FROM oven/bun:alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

RUN bun run build && \
    rm -rf node_modules && \
    rm -rf /tmp/*

FROM nginx:stable-alpine3.20-perl

COPY --from=build /app/dist/beauty-app /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
