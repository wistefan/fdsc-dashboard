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
 * BFF server configuration module.
 *
 * Reads all configuration from environment variables with sensible defaults.
 * This module is the single source of truth for server configuration —
 * no other module should read env vars directly.
 */

import { type LogLevel, parseLogLevel } from './logger.js'

/** Default port the BFF server listens on. */
const DEFAULT_PORT = 3000

/** Default auth configuration JSON served to the browser. */
const DEFAULT_AUTH_CONFIG_JSON = '{"providers":[]}'

/** Default directory for serving static frontend assets (relative to server root). */
const DEFAULT_STATIC_DIR = '../dist'

/**
 * Application configuration derived from environment variables.
 *
 * All downstream service URLs point to internal network addresses
 * that are not directly accessible from the browser. An empty string
 * means the service is not configured and its UI section will be hidden.
 */
export interface AppConfig {
  /** Port the BFF server listens on. */
  port: number
  /** Upstream URL for the Trusted Issuers List API (empty = disabled). */
  tilApiUrl: string
  /** Upstream URL for the Trusted Issuers Registry API (empty = disabled). */
  tirApiUrl: string
  /** Upstream URL for the Credentials Config Service API (empty = disabled). */
  ccsApiUrl: string
  /** Upstream URL for the ODRL Policy API (empty = disabled). */
  odrlApiUrl: string
  /** JSON string with OAuth2/OIDC provider configuration for the browser. */
  authConfigJson: string
  /** Directory from which static frontend assets are served. */
  staticDir: string
  /** Minimum log severity level for the BFF server. */
  logLevel: LogLevel
}

/**
 * Per-service availability flags exposed to the frontend.
 *
 * A service is considered enabled when its upstream URL is configured
 * (non-empty). The frontend uses this to hide navigation tabs and
 * route guards for services that are not available.
 */
export interface ServicesConfig {
  /** Whether the Trusted Issuers List service is available. */
  til: boolean
  /** Whether the Trusted Issuers Registry service is available. */
  tir: boolean
  /** Whether the Credentials Config Service is available. */
  ccs: boolean
  /** Whether the ODRL Policy service is available. */
  odrl: boolean
}

/**
 * Derives per-service availability flags from the application configuration.
 *
 * A service is enabled when its upstream URL is a non-empty string.
 *
 * @param config - Application configuration with upstream service URLs
 * @returns Object indicating which services are enabled
 */
export function getEnabledServices(config: AppConfig): ServicesConfig {
  return {
    til: config.tilApiUrl !== '',
    tir: config.tirApiUrl !== '',
    ccs: config.ccsApiUrl !== '',
    odrl: config.odrlApiUrl !== '',
  }
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
    tilApiUrl: env.TIL_API_URL || '',
    tirApiUrl: env.TIR_API_URL || '',
    ccsApiUrl: env.CCS_API_URL || '',
    odrlApiUrl: env.ODRL_API_URL || '',
    authConfigJson: env.AUTH_CONFIG_JSON || DEFAULT_AUTH_CONFIG_JSON,
    staticDir: env.STATIC_DIR || DEFAULT_STATIC_DIR,
    logLevel: parseLogLevel(env.LOG_LEVEL),
  }
}
