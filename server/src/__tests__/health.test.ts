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
 * Tests for the BFF health check endpoint.
 *
 * Verifies that GET /health returns the expected JSON response
 * with a 200 status code, suitable for container orchestrator probes.
 */

import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createHealthRouter } from '../health.js'

/** Expected HTTP status code for a healthy response. */
const HTTP_OK = 200

describe('GET /health', () => {
  /** Express app with only the health router mounted for isolation. */
  const app = express()
  app.use(createHealthRouter())

  it('returns 200 status code', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(HTTP_OK)
  })

  it('returns JSON body with status "ok"', async () => {
    const res = await request(app).get('/health')
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns application/json content type', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
