/**
 * Runtime configuration endpoint for the BFF server.
 *
 * Serves a `/config.js` JavaScript file that injects auth configuration
 * into the browser's `window` object. This replaces the previous approach
 * of using shell scripts to render config templates at container startup.
 */

import { Router } from 'express'
import type { AppConfig } from './config.js'

/** Content-Type header value for JavaScript responses. */
const CONTENT_TYPE_JAVASCRIPT = 'application/javascript'

/** HTTP status code for successful responses. */
const HTTP_OK = 200

/**
 * Creates an Express router that serves runtime auth configuration as JavaScript.
 *
 * `GET /config.js` returns a JavaScript snippet that assigns the auth
 * configuration to `window.__AUTH_CONFIG__`. The browser loads this script
 * before the SPA boots, making the auth provider config available at runtime
 * without requiring a rebuild.
 *
 * @param config - Application configuration containing the auth config JSON
 * @returns Express router with the `/config.js` endpoint mounted
 */
export function createRuntimeConfigRouter(config: AppConfig): Router {
  const router = Router()

  router.get('/config.js', (_req, res) => {
    const script = `window.__AUTH_CONFIG__ = ${config.authConfigJson};`
    res.status(HTTP_OK).type(CONTENT_TYPE_JAVASCRIPT).send(script)
  })

  return router
}
