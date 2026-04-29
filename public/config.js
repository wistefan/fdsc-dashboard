// Runtime configuration (fallback stub for `npm run preview`).
//
// During `npm run dev` the runtime-config Vite plugin (see vite.config.ts)
// intercepts this path and serves window.__SERVICES_CONFIG__ dynamically,
// derived from VITE_*_API_URL environment variables.
//
// In production the BFF server dynamically serves `/config.js` with both
// AUTH_CONFIG_JSON and per-service availability flags (see
// server/src/runtime-config.ts).
//
// This static file is only reached by `npm run preview` (no plugin, no BFF).
// We intentionally leave window.__AUTH_CONFIG__ untouched so that
// `loadAuthConfig()` falls back to VITE_AUTH_PROVIDERS. The services
// fallback in useServices.ts defaults to all-enabled when the global
// is absent, which is the desired behaviour for local preview.
