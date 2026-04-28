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
 * BFF (Backend-for-Frontend) server entry point.
 *
 * This Express application serves the Vue.js SPA as static files and
 * proxies all `/api/*` requests to downstream FIWARE services on the
 * private network. The browser never communicates directly with
 * downstream services — all traffic flows through this BFF.
 *
 * Middleware mount order:
 * 1. Security headers (helmet)
 * 2. CORS
 * 3. Health check (`/health`)
 * 4. Runtime config (`/config.js`)
 * 5. API proxy routes (`/api/{til,tir,ccs,odrl}/*`)
 * 6. Static file serving + SPA fallback (catch-all)
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.js'
import { createHealthRouter } from './health.js'
import { mountProxyMiddleware } from './proxy.js'
import { createRuntimeConfigRouter } from './runtime-config.js'
import { mountStaticServing } from './static.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = loadConfig()
const app = express()

// Security headers — allow inline scripts for the config.js injection
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)

// CORS — allow all origins in development; can be restricted via env vars later
app.use(cors())

// Health check endpoint
app.use(createHealthRouter())

// Runtime auth configuration
app.use(createRuntimeConfigRouter(config))

// API proxy routes to downstream services
mountProxyMiddleware(app, config)

// Static file serving + SPA fallback (must be last)
const staticDir = path.resolve(__dirname, config.staticDir)
mountStaticServing(app, staticDir)

app.listen(config.port, () => {
  console.log(`BFF server listening on port ${config.port}`)
  console.log(`Static files served from: ${staticDir}`)
})

export { app }
