/**
 * Public TypeScript types for the OAuth2 / OpenID Connect subsystem.
 *
 * These types describe the *shape* of authentication data at runtime. They
 * are intentionally decoupled from any specific OIDC client library so that
 * the Pinia store, router guard, and UI layer only depend on the types
 * declared here.
 */

import { ROLE_ADMIN, ROLE_VIEWER } from './constants'

/**
 * Canonical role assigned to an authenticated user.
 *
 * The dashboard recognises exactly two roles:
 * - `viewer` — read-only access.
 * - `admin` — full create / read / update / delete access.
 *
 * Providers are free to use any role names internally; the role mapping
 * configured per provider translates them to these canonical values.
 */
export type Role = typeof ROLE_VIEWER | typeof ROLE_ADMIN

/**
 * Mapping from provider-specific role strings to the canonical dashboard
 * roles. For example, a Keycloak realm that exposes `"dashboard-writer"`
 * can map it to `"admin"` with `{ "dashboard-writer": "admin" }`.
 *
 * When an incoming role is missing from the map, the user falls back to
 * the `viewer` role so that the dashboard fails closed on privilege.
 */
export type RoleMapping = Readonly<Record<string, Role>>

/**
 * Static configuration for a single OAuth2 / OpenID Connect provider.
 *
 * All URL-shaped fields are expected to be absolute URLs; the loader does
 * not perform schema validation beyond basic type checking — operators are
 * responsible for supplying correct values.
 */
export interface OAuthProviderConfig {
  /**
   * Stable identifier used in callback URLs and `sessionStorage` keys.
   * Must be URL-safe (`[a-zA-Z0-9_-]+`).
   */
  readonly id: string

  /**
   * Human-readable name shown in the login picker (e.g. `"Keycloak"`).
   */
  readonly displayName: string

  /**
   * OIDC issuer URL. The OIDC client performs discovery by appending
   * `/.well-known/openid-configuration` to this value.
   */
  readonly issuer: string

  /** OAuth2 client ID registered with the identity provider. */
  readonly clientId: string

  /**
   * Space-separated OAuth2 scopes to request. When omitted, the loader
   * substitutes `DEFAULT_OAUTH_SCOPES` (`openid profile`).
   *
   * Operators that legitimately need additional scopes (e.g. `email`,
   * `offline_access`) should opt in here explicitly.
   */
  readonly scopes?: readonly string[]

  /**
   * Dotted path inside the ID/access-token claims where the user's role
   * list is expected. Defaults to `realm_access.roles` (Keycloak-style).
   */
  readonly rolesClaimPath?: string

  /**
   * Optional mapping from provider-specific role names to canonical
   * dashboard roles. Applied after role extraction.
   */
  readonly roleMapping?: RoleMapping

  /**
   * Enable OIDC silent token renewal via a hidden iframe.
   * Requires the provider to support prompt=none; defaults to `false`.
   */
  readonly silentRenew?: boolean
}

/**
 * Effective authentication configuration loaded at application startup.
 *
 * When `providers` is empty the dashboard runs in "auth disabled" mode —
 * no router guards fire, no user menu is shown, and every UI control is
 * available as before.
 */
export interface AuthConfig {
  /** Zero or more configured OAuth2 providers. */
  readonly providers: readonly OAuthProviderConfig[]
}

/**
 * Information about the currently authenticated user, held in the auth
 * Pinia store.
 */
export interface AuthenticatedUser {
  /** Stable subject identifier (OIDC `sub` claim). */
  readonly subject: string

  /** Display name, usually the `name` or `preferred_username` claim. */
  readonly name: string

  /** Optional email claim — only present when the provider returns one. */
  readonly email?: string

  /** Canonical role resolved from the provider's role list. */
  readonly role: Role

  /** Id of the `OAuthProviderConfig` that issued this session. */
  readonly providerId: string
}
