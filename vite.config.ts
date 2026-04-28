import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

/**
 * Default backend API URLs for local development proxy.
 *
 * In production, the BFF Express server (see server/) serves the SPA and
 * proxies all /api/* requests to downstream services.
 *
 * During local frontend-only development (`npm run dev`), the Vite dev server
 * proxies /api/* requests using one of two modes:
 *
 * 1. **Direct mode (default):** Each /api/<service> path is proxied directly
 *    to a local backend instance. The service prefix is stripped before
 *    forwarding. Override individual targets with VITE_TIL_API_URL, etc.
 *
 * 2. **BFF mode:** Set VITE_BFF_URL (e.g. `http://localhost:3001`) to route
 *    all /api/* requests through a locally running BFF server instead.
 *    The BFF then forwards to downstream services on its own. This is useful
 *    for testing the full proxy chain locally.
 */

/** URL of a locally running BFF server. When set, all /api/* requests are forwarded there. */
const BFF_URL = process.env.VITE_BFF_URL || ''

/** Default target URL for the Trusted Issuers List backend in direct proxy mode. */
const DEFAULT_TIL_URL = 'http://localhost:8080'
/** Default target URL for the Trusted Issuers Registry backend in direct proxy mode. */
const DEFAULT_TIR_URL = 'http://localhost:8081'
/** Default target URL for the Credentials Config Service backend in direct proxy mode. */
const DEFAULT_CCS_URL = 'http://localhost:8082'
/** Default target URL for the ODRL Policy backend in direct proxy mode. */
const DEFAULT_ODRL_URL = 'http://localhost:8083'

/**
 * Build the proxy configuration for the Vite dev server.
 *
 * When VITE_BFF_URL is set, a single catch-all proxy forwards every /api/*
 * request to the BFF (preserving the full path so the BFF can route it).
 *
 * Otherwise, each service gets its own proxy entry that strips the
 * /api/<service> prefix and forwards to a direct backend URL.
 */
function buildProxyConfig(): Record<string, object> {
  if (BFF_URL) {
    return {
      '/api': {
        target: BFF_URL,
        changeOrigin: true,
      },
    }
  }

  return {
    '/api/til': {
      target: process.env.VITE_TIL_API_URL || DEFAULT_TIL_URL,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/til/, ''),
    },
    '/api/tir': {
      target: process.env.VITE_TIR_API_URL || DEFAULT_TIR_URL,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/tir/, ''),
    },
    '/api/ccs': {
      target: process.env.VITE_CCS_API_URL || DEFAULT_CCS_URL,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/ccs/, ''),
    },
    '/api/odrl': {
      target: process.env.VITE_ODRL_API_URL || DEFAULT_ODRL_URL,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/odrl/, ''),
    },
  }
}

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
    proxy: buildProxyConfig(),
  },
})
