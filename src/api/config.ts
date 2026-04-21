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
 */

import { OpenAPI as TilOpenAPI } from '@/api/generated/til'
import { OpenAPI as TirOpenAPI } from '@/api/generated/tir'
import { OpenAPI as CcsOpenAPI } from '@/api/generated/ccs'
import { OpenAPI as OdrlOpenAPI } from '@/api/generated/odrl'

/** Default proxy prefix for the Trusted Issuers List management API. */
const DEFAULT_TIL_BASE = '/api/til'
/** Default proxy prefix for the Trusted Issuers Registry (EBSI) API. */
const DEFAULT_TIR_BASE = '/api/tir'
/** Default proxy prefix for the Credentials Config Service API. */
const DEFAULT_CCS_BASE = '/api/ccs'
/** Default proxy prefix for the ODRL-PAP API. */
const DEFAULT_ODRL_BASE = '/api/odrl'

/**
 * Initialise every generated API client with the correct base URL.
 *
 * Call this once at application startup (e.g. in `main.ts`) before
 * any API requests are made.
 */
export function configureApiClients(): void {
  TilOpenAPI.BASE = import.meta.env.VITE_TIL_API_URL || DEFAULT_TIL_BASE
  TirOpenAPI.BASE = import.meta.env.VITE_TIR_API_URL || DEFAULT_TIR_BASE
  CcsOpenAPI.BASE = import.meta.env.VITE_CCS_API_URL || DEFAULT_CCS_BASE
  OdrlOpenAPI.BASE = import.meta.env.VITE_ODRL_API_URL || DEFAULT_ODRL_BASE
}
