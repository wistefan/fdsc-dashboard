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
 * Apisix Dashboard configuration loader.
 *
 * Produces a deterministic {@link ApisixConfig} from two possible sources,
 * checked in priority order:
 *
 * 1. `window.__APISIX_CONFIG__.upstreamUrl` — injected at container start
 *    by an nginx entrypoint that runs `envsubst` over a `/config.js`
 *    template. This is the production path and lets operators reconfigure
 *    a built image purely through environment variables.
 * 2. `import.meta.env.VITE_APISIX_DASHBOARD_URL` — a string captured at
 *    Vite build time. This is the local-development fallback so
 *    contributors can set the env var and `npm run dev` without also
 *    standing up an nginx layer.
 *
 * When neither source yields a non-empty string the loader returns
 * `{ upstreamUrl: null }` — meaning "Apisix Dashboard not configured".
 * The navigation-drawer entry is hidden and the `/apisix` route renders
 * an informational alert instead of a broken iframe.
 */

import {
  BUILD_TIME_APISIX_URL_ENV_VAR,
  RUNTIME_APISIX_CONFIG_GLOBAL,
  RUNTIME_APISIX_CONFIG_KEY,
} from './constants'
import type { ApisixConfig } from './types'

/** Frozen config returned when no upstream URL is configured. */
const UNCONFIGURED: ApisixConfig = Object.freeze({ upstreamUrl: null })

/**
 * Return `value` when it is a non-empty, non-whitespace-only string;
 * otherwise return `null`.
 *
 * @param value - the candidate string to validate.
 * @returns the trimmed string, or `null` if blank/missing.
 */
function nonBlank(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Attempt to read the upstream URL from the runtime-injected global.
 *
 * @returns the upstream URL string, or `null` when the global is absent
 *   or does not contain a usable value.
 */
function readRuntimeUrl(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const runtimeObj = (window as unknown as Record<string, unknown>)[
    RUNTIME_APISIX_CONFIG_GLOBAL
  ]
  if (runtimeObj === undefined || runtimeObj === null) {
    return null
  }
  if (typeof runtimeObj !== 'object' || Array.isArray(runtimeObj)) {
    return null
  }
  return nonBlank((runtimeObj as Record<string, unknown>)[RUNTIME_APISIX_CONFIG_KEY])
}

/**
 * Attempt to read the upstream URL from the Vite build-time env var.
 *
 * @returns the upstream URL string, or `null` when the env var is absent
 *   or blank.
 */
function readBuildTimeUrl(): string | null {
  return nonBlank(import.meta.env[BUILD_TIME_APISIX_URL_ENV_VAR])
}

/**
 * Load the effective Apisix Dashboard configuration for the current
 * application instance.
 *
 * Resolution order:
 * 1. `window.__APISIX_CONFIG__.upstreamUrl` (runtime injection).
 * 2. `import.meta.env.VITE_APISIX_DASHBOARD_URL` (build-time env var).
 * 3. `null` (not configured).
 *
 * This function is pure (no side-effects) so it is safe to call from
 * tests with a stubbed `window` / `import.meta.env`.
 *
 * @returns a frozen {@link ApisixConfig} — never `undefined`.
 */
export function loadApisixConfig(): ApisixConfig {
  const url = readRuntimeUrl() ?? readBuildTimeUrl()
  if (url === null) {
    return UNCONFIGURED
  }
  return Object.freeze({ upstreamUrl: url })
}

/**
 * Whether the supplied config has a non-null upstream URL, meaning the
 * Apisix Dashboard integration is active.
 *
 * @param config - an {@link ApisixConfig}, typically obtained from
 *   {@link loadApisixConfig}.
 * @returns `true` when the dashboard is configured and should be shown.
 */
export function isApisixConfigured(config: ApisixConfig): boolean {
  return config.upstreamUrl !== null
}
