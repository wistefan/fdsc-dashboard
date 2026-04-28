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
 * Proxy middleware for routing API requests to downstream services.
 *
 * Each downstream service (TIL, TIR, CCS, ODRL) gets a dedicated proxy
 * that strips the `/api/<service>` prefix before forwarding. All request
 * headers — including `Authorization` — are forwarded transparently.
 */

import { type Express } from 'express'
import { createProxyMiddleware, type Options } from 'http-proxy-middleware'
import type { AppConfig } from './config.js'

/** API path prefix for Trusted Issuers List routes. */
const TIL_API_PATH = '/api/til'

/** API path prefix for Trusted Issuers Registry routes. */
const TIR_API_PATH = '/api/tir'

/** API path prefix for Credentials Config Service routes. */
const CCS_API_PATH = '/api/ccs'

/** API path prefix for ODRL Policy routes. */
const ODRL_API_PATH = '/api/odrl'

/**
 * Descriptor for a single proxy route, mapping a local path prefix
 * to an upstream service URL.
 */
interface ProxyRoute {
  /** Local path prefix that triggers this proxy (e.g. `/api/til`). */
  path: string
  /** Full upstream URL to forward requests to. */
  target: string
}

/**
 * Creates proxy middleware options for a single downstream service.
 *
 * The middleware strips the local path prefix (e.g. `/api/til`) before
 * forwarding to the target, so `/api/til/v4/issuers` becomes `/v4/issuers`
 * at the upstream.
 *
 * @param route - The proxy route descriptor
 * @returns http-proxy-middleware options
 */
function createProxyOptions(route: ProxyRoute): Options {
  return {
    target: route.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route.path}`]: '',
    },
    // Forward all headers (including Authorization) transparently
    // by not modifying the proxy request headers
  }
}

/**
 * Mounts proxy middleware for all four downstream services on the Express app.
 *
 * Routes:
 * - `/api/til/*` → `config.tilApiUrl`
 * - `/api/tir/*` → `config.tirApiUrl`
 * - `/api/ccs/*` → `config.ccsApiUrl`
 * - `/api/odrl/*` → `config.odrlApiUrl`
 *
 * Each proxy strips its path prefix before forwarding and passes all
 * request headers through unchanged.
 *
 * @param app - The Express application to mount proxy routes on
 * @param config - Application configuration with upstream service URLs
 */
export function mountProxyMiddleware(app: Express, config: AppConfig): void {
  const routes: ProxyRoute[] = [
    { path: TIL_API_PATH, target: config.tilApiUrl },
    { path: TIR_API_PATH, target: config.tirApiUrl },
    { path: CCS_API_PATH, target: config.ccsApiUrl },
    { path: ODRL_API_PATH, target: config.odrlApiUrl },
  ]

  for (const route of routes) {
    app.use(route.path, createProxyMiddleware(createProxyOptions(route)))
  }
}
