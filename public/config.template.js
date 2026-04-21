// Runtime authentication configuration template.
//
// In production this file is consumed at container start by the nginx
// entrypoint script `scripts/docker-entrypoint.d/10-render-config.sh`,
// which uses `envsubst` to replace the AUTH_CONFIG_JSON placeholder on
// the assignment line below with the value of the AUTH_CONFIG_JSON
// environment variable, then writes the rendered output to
// `/usr/share/nginx/html/config.js`.
//
// The rendered file is loaded synchronously from `index.html` *before*
// the main application bundle, so that `window.__AUTH_CONFIG__` is
// already populated by the time `src/auth/config.ts#loadAuthConfig()`
// runs.
//
// If AUTH_CONFIG_JSON is unset or empty the entrypoint substitutes
// `{"providers":[]}`, which leaves the dashboard in auth-disabled mode.
//
// Example:
//     docker run -p 8080:80 \
//       -e AUTH_CONFIG_JSON='{"providers":[{"id":"keycloak", ...}]}' \
//       fdsc-dashboard
//
// This template file is **not** served by nginx in production — the
// entrypoint deletes it after rendering so the unsubstituted placeholder
// is never exposed.
window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};
