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
