#!/bin/sh
# Render /usr/share/nginx/html/config.js at container start.
#
# The nginx image executes every file in /docker-entrypoint.d/*.sh before
# launching nginx itself, which lets us materialise the runtime
# configuration without an image rebuild.
#
# Authentication configuration:
# - `AUTH_CONFIG_JSON` env var (valid JSON string) — substituted into the
#   template verbatim. Example:
#       AUTH_CONFIG_JSON='{"providers":[{"id":"keycloak", ...}]}'
# - unset or empty — the dashboard falls back to `{"providers":[]}`, which
#   leaves authentication disabled.
#
# API URL configuration:
# - Individual env vars: TIL_API_URL, TIR_API_URL, CCS_API_URL, ODRL_API_URL
# - Each defaults to an empty string when unset, which tells the frontend
#   to use the default nginx proxy paths (`/api/<service>`).
# - The script builds a JSON object (`API_CONFIG_JSON`) from these values.
# - Example:
#       docker run -p 8080:80 \
#         -e TIL_API_URL=https://til.example.com \
#         -e CCS_API_URL=https://ccs.example.com \
#         fdsc-dashboard
#
# The unsubstituted template file is deleted after rendering so that the
# placeholder is never served to clients.
set -eu

# --- Auth configuration ---
# Default: auth disabled (empty provider list). We treat both unset and
# explicitly empty values the same way so that passing an empty string
# does not produce invalid JavaScript.
if [ -z "${AUTH_CONFIG_JSON:-}" ]; then
  AUTH_CONFIG_JSON='{"providers":[]}'
fi
export AUTH_CONFIG_JSON

# --- API URL configuration ---
# Build a JSON object from individual environment variables. Each URL
# defaults to an empty string when the variable is not set, signalling
# the frontend to fall back to the default proxy path for that service.
TIL_API_URL="${TIL_API_URL:-}"
TIR_API_URL="${TIR_API_URL:-}"
CCS_API_URL="${CCS_API_URL:-}"
ODRL_API_URL="${ODRL_API_URL:-}"

API_CONFIG_JSON="{\"tilApiUrl\":\"${TIL_API_URL}\",\"tirApiUrl\":\"${TIR_API_URL}\",\"ccsApiUrl\":\"${CCS_API_URL}\",\"odrlApiUrl\":\"${ODRL_API_URL}\"}"
export API_CONFIG_JSON

TEMPLATE_FILE=/usr/share/nginx/html/config.template.js
OUTPUT_FILE=/usr/share/nginx/html/config.js

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "[entrypoint] ${TEMPLATE_FILE} not found; leaving ${OUTPUT_FILE} untouched." >&2
  exit 0
fi

# Restrict envsubst to only the known variables so that any literal `$`
# characters inside the JSON payloads are preserved as-is.
envsubst '${AUTH_CONFIG_JSON} ${API_CONFIG_JSON}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
rm -f "$TEMPLATE_FILE"

echo "[entrypoint] Rendered ${OUTPUT_FILE} from runtime configuration."
