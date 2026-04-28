/**
 * Static file serving and SPA fallback for the BFF server.
 *
 * Serves the built Vue.js SPA from the configured static directory.
 * For any request that does not match a static file or an API route,
 * returns `index.html` so that vue-router can handle client-side routing.
 */

import express, { type Express } from 'express'
import path from 'node:path'

/** Cache-Control max-age for static assets in seconds (1 day). */
const STATIC_MAX_AGE_SECONDS = 86400

/**
 * Mounts static file serving and SPA fallback on the Express app.
 *
 * Static files are served from `staticDir` with caching headers.
 * A catch-all fallback handler is added that returns `index.html`
 * for any `GET` request that hasn't been handled by other routes
 * (API proxies, health check, config.js). This enables client-side
 * routing with vue-router's history mode.
 *
 * @param app - The Express application to mount static serving on
 * @param staticDir - Absolute path to the directory containing built frontend assets
 */
export function mountStaticServing(app: Express, staticDir: string): void {
  // Serve static files with caching
  app.use(
    express.static(staticDir, {
      maxAge: STATIC_MAX_AGE_SECONDS * 1000, // express expects milliseconds
      index: ['index.html'],
    }),
  )

  // SPA fallback: return index.html for any unmatched GET request.
  // This must be mounted AFTER all other routes (API proxies, health, config).
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'))
  })
}
