# Stage 1: Build the Vue application
FROM node:20-alpine AS build

RUN apk add --no-cache curl bash

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .
RUN npm run generate:api && npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

# `envsubst` (from gettext) is needed by 10-render-config.sh to substitute
# runtime configuration variables into public/config.template.js at container
# start. The following environment variables are supported:
#
# Authentication:
#   AUTH_CONFIG_JSON  — JSON string with provider config (default: disabled).
#
# API service URLs (each defaults to empty → frontend uses /api/<svc> proxy):
#   TIL_API_URL   — Trusted Issuers List service base URL.
#   TIR_API_URL   — Trusted Issuers Registry service base URL.
#   CCS_API_URL   — Credentials Config Service base URL.
#   ODRL_API_URL  — ODRL Policy service base URL.
RUN apk add --no-cache gettext

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Install the runtime auth-config renderer. nginx:alpine's default entrypoint
# automatically executes every *.sh file in /docker-entrypoint.d/ before
# launching nginx, so we just drop our script in there.
COPY scripts/docker-entrypoint.d/10-render-config.sh /docker-entrypoint.d/10-render-config.sh
RUN chmod +x /docker-entrypoint.d/10-render-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
