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
 * Reads base URLs from Vite environment variables and applies them
 * to each generated OpenAPI client configuration.  During development
 * the Vite dev-server proxy rewrites `/api/<service>/*` to the real
 * backend, so the default base paths point at those proxy prefixes.
 *
 * In production (nginx) the same `/api/<service>` prefix is reverse-
 * proxied to the real backends via nginx config.
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

/** Default proxy prefix for the Trusted Issuers List management API. */
const DEFAULT_TIL_BASE = '/api/til'
/** Default proxy prefix for the Trusted Issuers Registry (EBSI) API. */
const DEFAULT_TIR_BASE = '/api/tir'
/** Default proxy prefix for the Credentials Config Service API. */
const DEFAULT_CCS_BASE = '/api/ccs'
/** Default proxy prefix for the ODRL-PAP API. */
const DEFAULT_ODRL_BASE = '/api/odrl'

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
 * Call this once at application startup (e.g. in `main.ts`) before
 * any API requests are made.
 */
export function configureApiClients(): void {
  TilOpenAPI.BASE = import.meta.env.VITE_TIL_API_URL || DEFAULT_TIL_BASE
  TirOpenAPI.BASE = import.meta.env.VITE_TIR_API_URL || DEFAULT_TIR_BASE
  CcsOpenAPI.BASE = import.meta.env.VITE_CCS_API_URL || DEFAULT_CCS_BASE
  OdrlOpenAPI.BASE = import.meta.env.VITE_ODRL_API_URL || DEFAULT_ODRL_BASE

  TilOpenAPI.TOKEN = authTokenResolver
  TirOpenAPI.TOKEN = authTokenResolver
  CcsOpenAPI.TOKEN = authTokenResolver
  OdrlOpenAPI.TOKEN = authTokenResolver
}
