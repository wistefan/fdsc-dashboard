/*
 * Copyright 2026 Seamless Middleware Technologies S.L and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
