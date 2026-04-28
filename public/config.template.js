// Runtime configuration template (DEPRECATED).
//
// This file was previously consumed by the nginx entrypoint script
// `scripts/docker-entrypoint.d/10-render-config.sh` which used `envsubst`
// to replace placeholders at container start. With the BFF architecture,
// the Express server now serves `/config.js` dynamically from the
// `AUTH_CONFIG_JSON` environment variable (see `server/src/runtime-config.ts`).
//
// This template is no longer used in production and will be removed
// in a future cleanup step.
window.__AUTH_CONFIG__ = ${AUTH_CONFIG_JSON};
