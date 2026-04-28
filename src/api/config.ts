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
 * Resolves the base URL for each generated OpenAPI client using a three-tier
 * fallback chain:
 *
 * 1. **Runtime injection** — `window.__API_CONFIG__` (set by the nginx
 *    entrypoint script `10-render-config.sh` from `TIL_API_URL` etc.
 *    environment variables at container startup).
 * 2. **Build-time env** — `import.meta.env.VITE_<SERVICE>_API_URL` (set at
 *    `vite build` time or in a local `.env` file during development).
 * 3. **Default proxy path** — `/api/<service>` (works with both the Vite
 *    dev-server proxy and the production nginx reverse-proxy).
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
// Named constants — avoid magic strings for global keys, field names, env
// var names, and default proxy paths.
// ---------------------------------------------------------------------------

/**
 * Key on the `window` object where the runtime API URL configuration is
 * injected by the nginx entrypoint script (`10-render-config.sh`).
 */
const API_CONFIG_GLOBAL_KEY = '__API_CONFIG__'

/**
 * Field name inside the runtime API config object for the Trusted Issuers
 * List management API URL.
 */
const FIELD_TIL_API_URL = 'tilApiUrl'

/**
 * Field name inside the runtime API config object for the Trusted Issuers
 * Registry (EBSI) API URL.
 */
const FIELD_TIR_API_URL = 'tirApiUrl'

/**
 * Field name inside the runtime API config object for the Credentials
 * Config Service API URL.
 */
const FIELD_CCS_API_URL = 'ccsApiUrl'

/**
 * Field name inside the runtime API config object for the ODRL-PAP API URL. */
const FIELD_ODRL_API_URL = 'odrlApiUrl'

/** Vite build-time env var name for the TIL API URL. */
const ENV_VITE_TIL_API_URL = 'VITE_TIL_API_URL'

/** Vite build-time env var name for the TIR API URL. */
const ENV_VITE_TIR_API_URL = 'VITE_TIR_API_URL'

/** Vite build-time env var name for the CCS API URL. */
const ENV_VITE_CCS_API_URL = 'VITE_CCS_API_URL'

/** Vite build-time env var name for the ODRL API URL. */
const ENV_VITE_ODRL_API_URL = 'VITE_ODRL_API_URL'

/** Default proxy prefix for the Trusted Issuers List management API. */
const DEFAULT_TIL_BASE = '/api/til'

/** Default proxy prefix for the Trusted Issuers Registry (EBSI) API. */
const DEFAULT_TIR_BASE = '/api/tir'

/** Default proxy prefix for the Credentials Config Service API. */
const DEFAULT_CCS_BASE = '/api/ccs'

/** Default proxy prefix for the ODRL-PAP API. */
const DEFAULT_ODRL_BASE = '/api/odrl'

// ---------------------------------------------------------------------------
// Runtime config loader
// ---------------------------------------------------------------------------

/**
 * Shape returned by {@link loadApiConfig}. Each field is either a non-empty
 * URL string extracted from the runtime config, or `undefined` when the
 * value was absent or empty (signalling that the caller should fall through
 * to the next tier).
 */
interface ApiConfigOverrides {
  tilApiUrl?: string
  tirApiUrl?: string
  ccsApiUrl?: string
  odrlApiUrl?: string
}

/**
 * Extract a string value from a record, returning `undefined` for missing
 * keys, non-string values, or empty strings.
 *
 * @param obj  - The record to read from.
 * @param key  - The property name to extract.
 * @returns The trimmed string value, or `undefined` if it should be ignored.
 */
function extractStringField(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key]
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Read the runtime API URL configuration from `window.__API_CONFIG__`.
 *
 * The nginx entrypoint script renders a `config.js` file that sets
 * `window.__API_CONFIG__` to a JSON object with per-service URL fields.
 * This function validates that the global is a plain object and extracts
 * any non-empty string URL fields.
 *
 * Empty strings (which the entrypoint injects when the corresponding env
 * var is unset) are treated as absent so that the caller falls through to
 * the next resolution tier.
 *
 * @returns An object whose fields are only present for URLs that were
 *   explicitly configured at runtime.
 */
function loadApiConfig(): ApiConfigOverrides {
  const raw = (window as Window)[API_CONFIG_GLOBAL_KEY]

  // Not set — common in local dev where config.js does not inject this global.
  if (raw == null) {
    return {}
  }

  // Guard: must be a plain object (not an array, Date, etc.).
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  const obj = raw as Record<string, unknown>

  return {
    tilApiUrl: extractStringField(obj, FIELD_TIL_API_URL),
    tirApiUrl: extractStringField(obj, FIELD_TIR_API_URL),
    ccsApiUrl: extractStringField(obj, FIELD_CCS_API_URL),
    odrlApiUrl: extractStringField(obj, FIELD_ODRL_API_URL),
  }
}

// ---------------------------------------------------------------------------
// URL resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a single service base URL using the three-tier fallback chain.
 *
 * 1. Runtime value from `window.__API_CONFIG__` (if non-empty).
 * 2. Build-time value from `import.meta.env.VITE_<SERVICE>_API_URL`.
 * 3. Default proxy path (`/api/<service>`).
 *
 * @param runtimeValue  - Value extracted from runtime config (may be `undefined`).
 * @param envVarName    - Name of the Vite env var to check at build time.
 * @param defaultBase   - Fallback proxy path used when neither runtime nor
 *                        build-time values are available.
 * @returns The resolved base URL string.
 */
function resolveServiceUrl(
  runtimeValue: string | undefined,
  envVarName: string,
  defaultBase: string,
): string {
  // Tier 1: runtime injection
  if (runtimeValue) {
    return runtimeValue
  }

  // Tier 2: build-time env var (cast needed because env var names are
  // accessed dynamically; the ImportMetaEnv interface declares them).
  const buildTimeValue = import.meta.env[envVarName] as string | undefined
  if (buildTimeValue && buildTimeValue.trim().length > 0) {
    return buildTimeValue
  }

  // Tier 3: default proxy path
  return defaultBase
}

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
 * Base URLs are resolved via a three-tier fallback chain per service:
 *
 * 1. **Runtime injection** — `window.__API_CONFIG__.<field>` (set at
 *    container startup via env vars such as `TIL_API_URL`).
 * 2. **Build-time env** — `import.meta.env.VITE_<SERVICE>_API_URL`.
 * 3. **Default proxy path** — `/api/<service>`.
 *
 * Call this once at application startup (e.g. in `main.ts`) before
 * any API requests are made.
 */
export function configureApiClients(): void {
  const runtimeConfig = loadApiConfig()

  TilOpenAPI.BASE = resolveServiceUrl(
    runtimeConfig.tilApiUrl,
    ENV_VITE_TIL_API_URL,
    DEFAULT_TIL_BASE,
  )
  TirOpenAPI.BASE = resolveServiceUrl(
    runtimeConfig.tirApiUrl,
    ENV_VITE_TIR_API_URL,
    DEFAULT_TIR_BASE,
  )
  CcsOpenAPI.BASE = resolveServiceUrl(
    runtimeConfig.ccsApiUrl,
    ENV_VITE_CCS_API_URL,
    DEFAULT_CCS_BASE,
  )
  OdrlOpenAPI.BASE = resolveServiceUrl(
    runtimeConfig.odrlApiUrl,
    ENV_VITE_ODRL_API_URL,
    DEFAULT_ODRL_BASE,
  )

  TilOpenAPI.TOKEN = authTokenResolver
  TirOpenAPI.TOKEN = authTokenResolver
  CcsOpenAPI.TOKEN = authTokenResolver
  OdrlOpenAPI.TOKEN = authTokenResolver
}
