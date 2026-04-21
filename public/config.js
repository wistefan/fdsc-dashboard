// Runtime authentication configuration (development/default stub).
//
// This file is loaded synchronously from `index.html` before the main
// bundle. In production the nginx container entrypoint overwrites it by
// rendering `config.template.js` with the `AUTH_CONFIG_JSON` environment
// variable (see `scripts/docker-entrypoint.d/10-render-config.sh`).
//
// For local `npm run dev` / `npm run preview` we intentionally leave
// `window.__AUTH_CONFIG__` untouched so that `loadAuthConfig()` falls back
// to the `VITE_AUTH_PROVIDERS` build-time environment variable. That lets
// contributors iterate on the auth flow without running a Docker build.
