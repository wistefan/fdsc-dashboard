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
 * Composable exposing per-service availability flags.
 *
 * The BFF injects `window.__SERVICES_CONFIG__` via `/config.js` before the
 * SPA boots. Each flag is `true` when the corresponding upstream URL was
 * configured at deploy time. When the global is absent (e.g. local Vite
 * dev server), all services default to enabled.
 */

/** Window global name injected by the BFF runtime-config endpoint. */
export const SERVICES_CONFIG_GLOBAL = '__SERVICES_CONFIG__'

/**
 * Per-service availability flags mirroring the BFF configuration.
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
 * Reads the services configuration from the runtime-injected window global.
 *
 * Falls back to all-enabled when the global is absent (Vite dev mode) or
 * not a valid object.
 *
 * @returns Resolved services configuration
 */
export function loadServicesConfig(): ServicesConfig {
  if (typeof window === 'undefined') {
    return { til: true, tir: true, ccs: true, odrl: true }
  }

  const raw = (window as unknown as Record<string, unknown>)[SERVICES_CONFIG_GLOBAL]
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    return {
      til: obj.til === true,
      tir: obj.tir === true,
      ccs: obj.ccs === true,
      odrl: obj.odrl === true,
    }
  }

  return { til: true, tir: true, ccs: true, odrl: true }
}

/**
 * Returns per-service availability flags.
 *
 * The configuration is read once from `window.__SERVICES_CONFIG__` on first
 * call and cached for all subsequent consumers.
 *
 * @returns Object with a boolean flag for each downstream service
 */
export function useServices(): ServicesConfig {
  return loadServicesConfig()
}
