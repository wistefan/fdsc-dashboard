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

# Enable the built-in 15-local-resolvers.envsh so that NGINX_LOCAL_RESOLVERS
# is populated from /etc/resolv.conf (works in Docker and k8s).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# Install the nginx config template.  The nginx image's built-in
# 20-envsubst-on-templates.sh renders *.template files from this directory
# into /etc/nginx/conf.d/ at container start, substituting environment
# variables (set by 15-set-nginx-env.envsh) into the config.
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Install entrypoint scripts.  nginx:alpine's entrypoint runs every *.sh
# and sources every *.envsh in /docker-entrypoint.d/ (alphabetical order)
# before launching nginx.
COPY scripts/docker-entrypoint.d/10-render-config.sh /docker-entrypoint.d/10-render-config.sh
COPY scripts/docker-entrypoint.d/15-set-nginx-env.envsh /docker-entrypoint.d/15-set-nginx-env.envsh
RUN chmod +x /docker-entrypoint.d/10-render-config.sh \
             /docker-entrypoint.d/15-set-nginx-env.envsh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
