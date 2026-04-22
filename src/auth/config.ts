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
 * Runtime auth configuration loader.
 *
 * Produces a deterministic {@link AuthConfig} from two possible sources,
 * checked in this order:
 *
 * 1. `window.__AUTH_CONFIG__` — injected at container start by an nginx
 *    entrypoint that runs `envsubst` over a `/config.js` template. This is
 *    the production path and lets operators reconfigure a *built* image
 *    purely through environment variables.
 * 2. `import.meta.env.VITE_AUTH_PROVIDERS` — a JSON string captured at
 *    Vite build time. This is the local-development fallback so contributors
 *    can `VITE_AUTH_PROVIDERS='[...]' npm run dev` without also standing up
 *    an nginx layer.
 *
 * When neither source yields a valid provider list the loader returns
 * `{ providers: [] }` so that the dashboard continues to run unauthenticated.
 * Malformed JSON from either source is logged as a warning and treated as
 * an empty list — we fail open on configuration errors rather than breaking
 * the entire dashboard.
 */

import {
  BUILD_TIME_CONFIG_ENV_VAR,
  DEFAULT_OAUTH_SCOPES,
  RUNTIME_CONFIG_GLOBAL,
} from './constants'
import type { AuthConfig, OAuthProviderConfig } from './types'

/** An empty, frozen `AuthConfig` used whenever no providers are configured. */
const EMPTY_AUTH_CONFIG: AuthConfig = Object.freeze({ providers: [] })

/**
 * Minimum set of fields that must be present on any raw provider entry for
 * it to be considered a valid {@link OAuthProviderConfig} candidate.
 */
const REQUIRED_PROVIDER_FIELDS = ['id', 'displayName', 'issuer', 'clientId'] as const

/**
 * Narrow `unknown` to a plain object keyed by strings.
 *
 * @param value — the value to test.
 * @returns `true` when `value` is a non-null object that is not an array.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coerce a raw, unvalidated value into a strongly typed
 * {@link OAuthProviderConfig}, or return `null` if it is not shaped correctly.
 *
 * Unknown extra fields are ignored so that future versions of the config
 * schema can add fields without the loader blowing up.
 */
function normaliseProvider(raw: unknown): OAuthProviderConfig | null {
  if (!isPlainObject(raw)) {
    return null
  }

  for (const field of REQUIRED_PROVIDER_FIELDS) {
    if (typeof raw[field] !== 'string' || (raw[field] as string).length === 0) {
      return null
    }
  }

  const scopes = Array.isArray(raw.scopes)
    ? raw.scopes.filter((s): s is string => typeof s === 'string')
    : undefined

  const roleMapping = isPlainObject(raw.roleMapping)
    ? normaliseRoleMapping(raw.roleMapping)
    : undefined

  return {
    id: raw.id as string,
    displayName: raw.displayName as string,
    issuer: raw.issuer as string,
    clientId: raw.clientId as string,
    scopes: scopes && scopes.length > 0 ? Object.freeze(scopes) : undefined,
    rolesClaimPath:
      typeof raw.rolesClaimPath === 'string' && raw.rolesClaimPath.length > 0
        ? raw.rolesClaimPath
        : undefined,
    roleMapping,
    silentRenew: raw.silentRenew === true,
  }
}

/**
 * Convert a raw object to a role-mapping record, dropping any entries whose
 * value is not one of the canonical `Role` strings.
 */
function normaliseRoleMapping(
  raw: Record<string, unknown>,
): OAuthProviderConfig['roleMapping'] {
  const entries: [string, 'viewer' | 'admin'][] = []
  for (const [key, value] of Object.entries(raw)) {
    if (value === 'viewer' || value === 'admin') {
      entries.push([key, value])
    }
  }
  if (entries.length === 0) {
    return undefined
  }
  return Object.freeze(Object.fromEntries(entries))
}

/**
 * Parse a JSON string source and return a validated provider array.
 *
 * The JSON may be either an array of provider objects or an object with a
 * `providers` array — the shape that matches the exported `AuthConfig`
 * interface. Any other shape is treated as invalid.
 *
 * @param source — the raw JSON string (trimmed before parsing).
 * @param origin — human-readable source label used in warning logs.
 * @returns a frozen array of normalised providers, or `null` if invalid.
 */
function parseProviderJson(
  source: string,
  origin: string,
): readonly OAuthProviderConfig[] | null {
  const trimmed = source.trim()
  if (trimmed.length === 0) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    console.warn(
      `[auth] Ignoring malformed auth configuration from ${origin}:`,
      err,
    )
    return null
  }

  let providersRaw: unknown
  if (Array.isArray(parsed)) {
    providersRaw = parsed
  } else if (isPlainObject(parsed) && Array.isArray(parsed.providers)) {
    providersRaw = parsed.providers
  } else {
    console.warn(
      `[auth] Auth configuration from ${origin} is not an array or ` +
        `{providers: [...]} object; treating as disabled.`,
    )
    return null
  }

  const providers: OAuthProviderConfig[] = []
  const rawList = providersRaw as unknown[]
  for (let i = 0; i < rawList.length; i += 1) {
    const normalised = normaliseProvider(rawList[i])
    if (normalised === null) {
      console.warn(
        `[auth] Dropping invalid provider entry #${i} from ${origin}.`,
      )
      continue
    }
    providers.push(normalised)
  }
  return Object.freeze(providers)
}

/**
 * Read the runtime-injected auth config off the global object.
 *
 * Returns `null` when no such global has been set (for example during
 * local Vite dev, tests, or production builds that omit `/config.js`).
 */
function readRuntimeConfig(): readonly OAuthProviderConfig[] | null {
  if (typeof window === 'undefined') {
    return null
  }
  const runtime = (window as unknown as Record<string, unknown>)[
    RUNTIME_CONFIG_GLOBAL
  ]
  if (runtime === undefined || runtime === null) {
    return null
  }
  // When the host already injected a parsed object, re-serialise so the same
  // validation pipeline runs in both runtime and build-time paths.
  const json =
    typeof runtime === 'string' ? runtime : JSON.stringify(runtime)
  return parseProviderJson(json, `window.${RUNTIME_CONFIG_GLOBAL}`)
}

/**
 * Read the build-time auth config from the Vite env var, if present.
 */
function readBuildTimeConfig(): readonly OAuthProviderConfig[] | null {
  const raw = import.meta.env[BUILD_TIME_CONFIG_ENV_VAR]
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }
  return parseProviderJson(raw, `import.meta.env.${BUILD_TIME_CONFIG_ENV_VAR}`)
}

/**
 * Load the effective authentication configuration for the current
 * application instance.
 *
 * This function is pure (modulo `console.warn`) so it is safe to call from
 * tests with a stubbed `window`/`import.meta.env`.
 *
 * @returns the loaded config — always an object, never `null` or `undefined`.
 *   An empty `providers` array means "auth disabled".
 */
export function loadAuthConfig(): AuthConfig {
  const providers = readRuntimeConfig() ?? readBuildTimeConfig()
  if (providers === null || providers.length === 0) {
    return EMPTY_AUTH_CONFIG
  }
  return Object.freeze({ providers })
}

/**
 * Whether the supplied config has at least one configured provider, i.e.
 * whether authentication is required for the dashboard.
 *
 * @param config — an {@link AuthConfig}, typically obtained from
 *   {@link loadAuthConfig}.
 */
export function isAuthEnabled(config: AuthConfig): boolean {
  return config.providers.length > 0
}

/**
 * Look up a provider by its `id`.
 *
 * @param config — the loaded auth config.
 * @param id — the provider id to resolve.
 * @returns the matching provider, or `undefined` when none is configured with
 *   the given id.
 */
export function getProviderById(
  config: AuthConfig,
  id: string,
): OAuthProviderConfig | undefined {
  return config.providers.find((p) => p.id === id)
}

/**
 * Resolve the scopes to request for a given provider, falling back to
 * {@link DEFAULT_OAUTH_SCOPES} when the provider configuration omits them.
 *
 * @param provider — the provider whose scopes should be resolved.
 * @returns a readonly array of scope strings, guaranteed non-empty and
 *   containing `openid` when the default is used.
 */
export function resolveScopes(
  provider: OAuthProviderConfig,
): readonly string[] {
  if (provider.scopes && provider.scopes.length > 0) {
    return provider.scopes
  }
  return DEFAULT_OAUTH_SCOPES
}
