// Runtime configuration (development/default stub).
//
// This file is loaded synchronously from `index.html` before the main
// bundle. In production the BFF server dynamically serves `/config.js`
// with the `AUTH_CONFIG_JSON` environment variable (see
// `server/src/runtime-config.ts`).
//
// For local `npm run dev` / `npm run preview` we intentionally leave
// `window.__AUTH_CONFIG__` untouched so that `loadAuthConfig()` falls back
// to the `VITE_AUTH_PROVIDERS` build-time environment variable. That lets
// contributors iterate on the auth flow without running a Docker build.
