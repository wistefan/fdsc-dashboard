// Runtime configuration template.
//
// In production this file is consumed at container start by the nginx
// entrypoint script `scripts/docker-entrypoint.d/10-render-config.sh`,
// which uses `envsubst` to replace the AUTH_CONFIG_JSON and
// API_CONFIG_JSON placeholders below with the values of the
// corresponding environment variables, then writes the rendered output
// to `/usr/share/nginx/html/config.js`.
//
// The rendered file is loaded synchronously from `index.html` *before*
// the main application bundle, so that `window.__AUTH_CONFIG__` and
// `window.__API_CONFIG__` are already populated by the time the Vue
// application bootstraps.
//
// If AUTH_CONFIG_JSON is unset or empty the entrypoint substitutes
// `{"providers":[]}`, which leaves the dashboard in auth-disabled mode.
//
// API_CONFIG_JSON is built by the entrypoint from individual env vars
// (TIL_API_URL, TIR_API_URL, CCS_API_URL, ODRL_API_URL). When none
// are set, each URL defaults to an empty string, which tells the
// frontend to use the default nginx proxy paths (`/api/<service>`).
//
// Example:
//     docker run -p 8080:80 \
//       -e AUTH_CONFIG_JSON='{"providers":[{"id":"keycloak", ...}]}' \
//       -e TIL_API_URL=https://til.example.com \
//       -e TIR_API_URL=https://tir.example.com \
//       fdsc-dashboard
//
// This template file is **not** served by nginx in production — the
// entrypoint deletes it after rendering so the unsubstituted placeholder
// is never exposed.
window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};
window.__API_CONFIG__ = ${API_CONFIG_JSON};
