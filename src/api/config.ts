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
 * API configuration module.
 *
 * Wires every generated OpenAPI client to its fixed BFF proxy path
 * (`/api/<service>`) and installs a shared bearer-token resolver.
 *
 * In both development (Vite dev-server proxy) and production (Express BFF),
 * the browser sends API requests to relative `/api/*` paths on the same
 * origin. The server-side proxy forwards them to the actual downstream
 * services on a private network.
 *
 * This module also wires a shared `Authorization: Bearer <jwt>` token
 * resolver into every generated client. The generated request helper
 * (`getHeaders` in each client's `core/request.ts`) only emits the
 * `Authorization` header when the resolver returns a non-empty string,
 * so returning an empty string is the correct way to suppress the
 * header when no token is configured.
 */

import { OpenAPI as TilOpenAPI } from '@/api/generated/til'
import { OpenAPI as TirOpenAPI } from '@/api/generated/tir'
import { OpenAPI as CcsOpenAPI } from '@/api/generated/ccs'
import { OpenAPI as OdrlOpenAPI } from '@/api/generated/odrl'
import { getAuthTokenSync } from '@/composables/useAuth'

// ---------------------------------------------------------------------------
// Named constants — BFF proxy paths for each downstream service.
// ---------------------------------------------------------------------------

/** BFF proxy path for the Trusted Issuers List management API. */
const TIL_PROXY_PATH = '/api/til'

/** BFF proxy path for the Trusted Issuers Registry (EBSI) API. */
const TIR_PROXY_PATH = '/api/tir'

/** BFF proxy path for the Credentials Config Service API. */
const CCS_PROXY_PATH = '/api/ccs'

/** BFF proxy path for the ODRL-PAP API. */
const ODRL_PROXY_PATH = '/api/odrl'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Shared token resolver installed on every generated OpenAPI client.
 *
 * The generated `getHeaders` helper only adds the `Authorization` header when
 * this resolver resolves to a non-empty string (its internal `isStringWithValue`
 * guard returns `false` for empty strings). Returning an empty string is
 * therefore the idiomatic way to suppress the header when no JWT is configured.
 *
 * A single shared function literal is used across all four clients so tests
 * can assert reference equality.
 *
 * @returns A promise resolving to the current JWT, or an empty string when
 *   the dashboard is unauthenticated.
 */
export const authTokenResolver = async (): Promise<string> => getAuthTokenSync()

/**
 * Initialise every generated API client with the correct base URL and a
 * shared bearer-token resolver.
 *
 * Each client's `OpenAPI.BASE` is set to its fixed BFF proxy path
 * (`/api/<service>`). In production the Express BFF forwards these
 * requests to downstream services; in development the Vite dev-server
 * proxy performs the same role.
 *
 * Call this once at application startup (e.g. in `main.ts`) before
 * any API requests are made.
 */
export function configureApiClients(): void {
  TilOpenAPI.BASE = TIL_PROXY_PATH
  TirOpenAPI.BASE = TIR_PROXY_PATH
  CcsOpenAPI.BASE = CCS_PROXY_PATH
  OdrlOpenAPI.BASE = ODRL_PROXY_PATH

  TilOpenAPI.TOKEN = authTokenResolver
  TirOpenAPI.TOKEN = authTokenResolver
  CcsOpenAPI.TOKEN = authTokenResolver
  OdrlOpenAPI.TOKEN = authTokenResolver
}
