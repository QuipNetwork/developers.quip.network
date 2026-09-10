FROM docker.io/denoland/deno:bin-2.5.4 AS deno

FROM node:22-bookworm-slim

COPY --from=deno /deno /usr/local/bin/deno

ENV DENO_DIR=/app/node_modules/.deno

ENV ASTRO_TELEMETRY_DISABLED=1
ENV DO_NOT_TRACK=1
RUN mkdir -p /root/.config/netlify \
 && echo '{"telemetryDisabled":true}' > /root/.config/netlify/config.json

RUN mkdir /app
WORKDIR /app
