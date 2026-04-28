/**
 * Health check endpoint for the BFF server.
 *
 * Returns a simple JSON response indicating the server is running.
 * Used by container orchestrators (Docker, Kubernetes) for liveness probes.
 */

import { Router } from 'express'

/** HTTP status code for a healthy response. */
const HTTP_OK = 200

/**
 * Creates an Express router with the health check endpoint.
 *
 * `GET /health` returns `{ status: "ok" }` with a 200 status code.
 *
 * @returns Express router with the health endpoint mounted
 */
export function createHealthRouter(): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.status(HTTP_OK).json({ status: 'ok' })
  })

  return router
}
