// Runtime configuration template.
//
// In production this file is consumed at container start by the nginx
// entrypoint script `scripts/docker-entrypoint.d/10-render-config.sh`,
// which uses `envsubst` to replace the AUTH_CONFIG_JSON placeholder
// below with the value of the corresponding environment variable, then
// writes the rendered output to `/usr/share/nginx/html/config.js`.
//
// The rendered file is loaded synchronously from `index.html` *before*
// the main application bundle, so that `window.__AUTH_CONFIG__` is
// already populated by the time the Vue application bootstraps.
//
// If AUTH_CONFIG_JSON is unset or empty the entrypoint substitutes
// `{"providers":[]}`, which leaves the dashboard in auth-disabled mode.
//
// Note: API URL configuration is no longer injected via this template.
// The BFF server proxies all `/api/*` requests to downstream services
// on a private network, so the frontend always uses relative paths.
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
