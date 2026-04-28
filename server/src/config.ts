/**
 * BFF server configuration module.
 *
 * Reads all configuration from environment variables with sensible defaults.
 * This module is the single source of truth for server configuration —
 * no other module should read env vars directly.
 */

/** Default port the BFF server listens on. */
const DEFAULT_PORT = 3000

/** Default upstream URL for the Trusted Issuers List service. */
const DEFAULT_TIL_API_URL = 'http://til-service:8080'

/** Default upstream URL for the Trusted Issuers Registry service. */
const DEFAULT_TIR_API_URL = 'http://tir-service:8080'

/** Default upstream URL for the Credentials Config Service. */
const DEFAULT_CCS_API_URL = 'http://ccs-service:8080'

/** Default upstream URL for the ODRL Policy service. */
const DEFAULT_ODRL_API_URL = 'http://odrl-service:8080'

/** Default auth configuration JSON served to the browser. */
const DEFAULT_AUTH_CONFIG_JSON = '{"providers":[]}'

/** Default directory for serving static frontend assets (relative to server root). */
const DEFAULT_STATIC_DIR = '../dist'

/**
 * Application configuration derived from environment variables.
 *
 * All downstream service URLs point to internal network addresses
 * that are not directly accessible from the browser.
 */
export interface AppConfig {
  /** Port the BFF server listens on. */
  port: number
  /** Upstream URL for the Trusted Issuers List API. */
  tilApiUrl: string
  /** Upstream URL for the Trusted Issuers Registry API. */
  tirApiUrl: string
  /** Upstream URL for the Credentials Config Service API. */
  ccsApiUrl: string
  /** Upstream URL for the ODRL Policy API. */
  odrlApiUrl: string
  /** JSON string with OAuth2/OIDC provider configuration for the browser. */
  authConfigJson: string
  /** Directory from which static frontend assets are served. */
  staticDir: string
}

/**
 * Parses the PORT environment variable into a valid port number.
 *
 * Returns the default port if the value is missing, empty, or not a valid
 * integer in the range 1–65535.
 *
 * @param value - Raw string value from the environment variable
 * @returns A valid port number
 */
export function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT
  }
  return parsed
}

/**
 * Loads application configuration from environment variables.
 *
 * Each setting has a sensible default so the server can start without
 * any explicit configuration (useful for local development).
 *
 * @param env - Environment variable map (defaults to `process.env`)
 * @returns Fully resolved application configuration
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    tilApiUrl: env.TIL_API_URL || DEFAULT_TIL_API_URL,
    tirApiUrl: env.TIR_API_URL || DEFAULT_TIR_API_URL,
    ccsApiUrl: env.CCS_API_URL || DEFAULT_CCS_API_URL,
    odrlApiUrl: env.ODRL_API_URL || DEFAULT_ODRL_API_URL,
    authConfigJson: env.AUTH_CONFIG_JSON || DEFAULT_AUTH_CONFIG_JSON,
    staticDir: env.STATIC_DIR || DEFAULT_STATIC_DIR,
  }
}
