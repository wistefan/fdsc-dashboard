import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

/**
 * Default backend API URLs for local development proxy.
 *
 * In production, the BFF Express server (see server/) serves the SPA and
 * proxies all /api/* requests to downstream services. These Vite dev-server
 * proxy entries are only used during frontend-only development (`npm run dev`)
 * when the BFF is not running.
 */
const DEFAULT_TIL_URL = 'http://localhost:8080'
const DEFAULT_TIR_URL = 'http://localhost:8081'
const DEFAULT_CCS_URL = 'http://localhost:8082'
const DEFAULT_ODRL_URL = 'http://localhost:8083'

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
    },
  },
})
