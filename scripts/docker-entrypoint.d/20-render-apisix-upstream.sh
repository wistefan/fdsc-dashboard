#!/bin/sh
# Resolve the APISIX_DASHBOARD_URL variable in the nginx configuration at
# container start so operators can override the upstream Apisix Dashboard
# host without rebuilding the image.
#
# The nginx image executes every file in /docker-entrypoint.d/*.sh before
# launching nginx itself.
#
# Behaviour:
# - `APISIX_DASHBOARD_URL` env var — substituted into the nginx config
#   template. Example:
#       APISIX_DASHBOARD_URL='http://apisix-dashboard:9000'
# - unset or empty — defaults to `http://apisix-dashboard:9000`, the
#   conventional Docker Compose / Kubernetes service name and port.
set -eu

# Default upstream: standard Apisix Dashboard service name and port.
DEFAULT_APISIX_DASHBOARD_URL='http://apisix-dashboard:9000'

if [ -z "${APISIX_DASHBOARD_URL:-}" ]; then
  APISIX_DASHBOARD_URL="$DEFAULT_APISIX_DASHBOARD_URL"
fi
export APISIX_DASHBOARD_URL

NGINX_CONF=/etc/nginx/conf.d/default.conf

if [ ! -f "$NGINX_CONF" ]; then
  echo "[entrypoint] ${NGINX_CONF} not found; skipping Apisix upstream substitution." >&2
  exit 0
fi

# Create a temporary file, substitute, then move atomically to avoid
# serving a partially-written config if nginx starts early.
TEMP_CONF="${NGINX_CONF}.tmp"

# Restrict envsubst to only APISIX_DASHBOARD_URL so that other nginx
# variables (e.g. $host, $remote_addr) are left intact.
envsubst '${APISIX_DASHBOARD_URL}' < "$NGINX_CONF" > "$TEMP_CONF"
mv "$TEMP_CONF" "$NGINX_CONF"

echo "[entrypoint] Rendered Apisix Dashboard upstream: ${APISIX_DASHBOARD_URL}"
