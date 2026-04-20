/**
 * Authentication constants.
 *
 * Centralises every magic string used by the OAuth2 / OpenID Connect
 * subsystem so that tests, the config loader, the Pinia store, and the
 * router guard share a single source of truth.
 */

/** Canonical role identifier for users that may only read resources. */
export const ROLE_VIEWER = 'viewer' as const

/** Canonical role identifier for users with full read/write/delete access. */
export const ROLE_ADMIN = 'admin' as const

/**
 * The default OpenID Connect scopes requested when a provider configuration
 * omits an explicit `scopes` list.
 *
 * `openid` is mandatory to get an ID token; `profile` is required so the
 * dashboard can display the user's name. `email` is intentionally **not**
 * included — data minimisation. Operators that genuinely need the email
 * claim should set `scopes` explicitly on the provider configuration.
 */
export const DEFAULT_OAUTH_SCOPES: readonly string[] = Object.freeze([
  'openid',
  'profile',
])

/**
 * Default dotted path used to locate the user's role list inside the ID/access
 * token claims when a provider configuration omits `rolesClaimPath`.
 *
 * The default matches Keycloak's `realm_access.roles` shape because Keycloak
 * is the reference identity provider for FIWARE deployments.
 */
export const DEFAULT_ROLES_CLAIM_PATH = 'realm_access.roles'

/**
 * Name of the global where a host-rendered runtime configuration script
 * (`/config.js`) is expected to assign the `AuthConfig` JSON payload.
 *
 * Example injected at container start by nginx / envsubst:
 * `window.__AUTH_CONFIG__ = { "providers": [ ... ] }`.
 */
export const RUNTIME_CONFIG_GLOBAL = '__AUTH_CONFIG__' as const

/**
 * Name of the Vite environment variable that carries the same JSON payload
 * for local development (fallback when no runtime config has been injected).
 */
export const BUILD_TIME_CONFIG_ENV_VAR = 'VITE_AUTH_PROVIDERS' as const

/**
 * Route path handling the OAuth2 redirect callback for a given provider.
 * `:providerId` is substituted with the provider's `id`.
 */
export const CALLBACK_ROUTE_TEMPLATE = '/callback/:providerId' as const

/** Route path of the provider-picker login view. */
export const LOGIN_ROUTE_PATH = '/login' as const

/**
 * `sessionStorage` key used to persist the `returnTo` path while the browser
 * is bounced through the identity provider's authorisation endpoint.
 */
export const RETURN_TO_STORAGE_KEY = 'fdsc.auth.returnTo' as const
