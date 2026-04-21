#!/bin/sh
# Render /usr/share/nginx/html/config.js at container start.
#
# The nginx image executes every file in /docker-entrypoint.d/*.sh before
# launching nginx itself, which lets us materialise the runtime auth
# configuration without an image rebuild.
#
# Behaviour:
# - `AUTH_CONFIG_JSON` env var (valid JSON string) — substituted into the
#   template verbatim. Example:
#       AUTH_CONFIG_JSON='{"providers":[{"id":"keycloak", ...}]}'
# - unset or empty — the dashboard falls back to `{"providers":[]}`, which
#   leaves authentication disabled and is indistinguishable from today's
#   behaviour.
#
# The unsubstituted template file is deleted after rendering so that the
# placeholder is never served to clients.
set -eu

# Default: auth disabled (empty provider list). We treat both unset and
# explicitly empty values the same way so that passing an empty string
# does not produce invalid JavaScript.
if [ -z "${AUTH_CONFIG_JSON:-}" ]; then
  AUTH_CONFIG_JSON='{"providers":[]}'
fi
export AUTH_CONFIG_JSON

TEMPLATE_FILE=/usr/share/nginx/html/config.template.js
OUTPUT_FILE=/usr/share/nginx/html/config.js

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "[entrypoint] ${TEMPLATE_FILE} not found; leaving ${OUTPUT_FILE} untouched." >&2
  exit 0
fi

# Restrict envsubst to only the AUTH_CONFIG_JSON variable so that any
# literal `$` characters inside the JSON payload are preserved as-is.
envsubst '${AUTH_CONFIG_JSON}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
rm -f "$TEMPLATE_FILE"

echo "[entrypoint] Rendered ${OUTPUT_FILE} from runtime auth configuration."
