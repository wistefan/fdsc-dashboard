import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

/** Default backend API port for the Trusted Issuers List local development proxy. */
const DEFAULT_TIL_URL = 'http://localhost:8080'

/** Default backend API port for the Trusted Issuers Registry local development proxy. */
const DEFAULT_TIR_URL = 'http://localhost:8081'

/** Default backend API port for the Credentials Config Service local development proxy. */
const DEFAULT_CCS_URL = 'http://localhost:8082'

/** Default backend API port for the ODRL policy service local development proxy. */
const DEFAULT_ODRL_URL = 'http://localhost:8083'

/**
 * Default upstream URL for the Apache APISIX Dashboard.
 *
 * Port 9000 is the standard port the Apisix Dashboard Docker image
 * exposes. Override at dev-time via `VITE_APISIX_DASHBOARD_URL`.
 */
const DEFAULT_APISIX_URL = 'http://localhost:9000'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/til': {
        target: process.env.VITE_TIL_API_URL || DEFAULT_TIL_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/til/, ''),
      },
      '/api/tir': {
        target: process.env.VITE_TIR_API_URL || DEFAULT_TIR_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tir/, ''),
      },
      '/api/ccs': {
        target: process.env.VITE_CCS_API_URL || DEFAULT_CCS_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ccs/, ''),
      },
      '/api/odrl': {
        target: process.env.VITE_ODRL_API_URL || DEFAULT_ODRL_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/odrl/, ''),
      },
      // Reverse-proxy passthrough to the Apache APISIX Dashboard.
      // The upstream expects traffic at /apisix-dashboard/ (its default
      // path_prefix), so we do NOT rewrite the path. If the operator's
      // Apisix Dashboard uses a different prefix (e.g. root `/`), add a
      // rewrite rule here:
      //   rewrite: (path) => path.replace(/^\/apisix-dashboard/, ''),
      '/apisix-dashboard': {
        target: process.env.VITE_APISIX_DASHBOARD_URL || DEFAULT_APISIX_URL,
        changeOrigin: true,
        // WebSocket support enabled defensively — Apisix Dashboard does not
        // currently use websockets, but this avoids surprises with any
        // HMR-style endpoints or future upstream changes.
        ws: true,
      },
    },
  },
})
