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
 * Thin facade over `oidc-client-ts` that turns an {@link OAuthProviderConfig}
 * into a fully configured `UserManager` and exposes the subset of operations
 * the rest of the dashboard needs (sign-in redirect, callback handling,
 * sign-out, fetch & clear the cached user).
 *
 * Design notes:
 * - Authorisation-code flow with PKCE. The library enables PKCE by default
 *   and we never set `disablePKCE`, so the code-challenge is always sent.
 * - Interaction state and the logged-in user are persisted to
 *   `sessionStorage`. This scopes the session to a single browser tab and
 *   automatically clears on close — appropriate for an admin dashboard.
 * - Each provider gets its own storage namespace
 *   (`${OIDC_STORAGE_KEY_PREFIX}${provider.id}.`) so that two providers
 *   configured in parallel cannot collide on state keys.
 * - `UserManager` instances are memoised per provider. Constructing a
 *   new manager for every API call would re-build the internal silent-renew
 *   service on each invocation.
 */

import {
  User,
  UserManager,
  WebStorageStateStore,
  type UserManagerSettings,
} from 'oidc-client-ts'

import {
  CALLBACK_ROUTE_PREFIX,
  OAUTH_RESPONSE_TYPE_CODE,
  OIDC_STORAGE_KEY_PREFIX,
} from './constants'
import { resolveScopes } from './config'
import type { OAuthProviderConfig } from './types'

/**
 * OIDC scopes are sent to the authorisation server as a single
 * space-separated string. Centralised so tests can rely on the exact
 * separator.
 */
const SCOPE_SEPARATOR = ' '

/**
 * Memoisation cache so repeated calls to {@link getUserManager} for the
 * same provider reuse the same underlying `UserManager` instance.
 */
const userManagerCache = new Map<string, UserManager>()

/**
 * Build the absolute OAuth2 redirect URI for a given provider.
 *
 * The URI is derived from `window.location.origin` at call time so the
 * same build works unchanged across dev (`http://localhost:3000`), preview,
 * and production deployments.
 *
 * @param providerId — id of the configured provider, used as the route
 *   parameter of the callback page.
 * @returns an absolute URL such as
 *   `http://localhost:3000/callback/keycloak`.
 * @throws Error when called in a non-browser environment (no `window`).
 */
export function buildRedirectUri(providerId: string): string {
  if (typeof window === 'undefined') {
    throw new Error(
      '[auth] buildRedirectUri() requires a browser environment with `window`.',
    )
  }
  return `${window.location.origin}${CALLBACK_ROUTE_PREFIX}${providerId}`
}

/**
 * Translate an {@link OAuthProviderConfig} into the settings object that
 * `oidc-client-ts` expects.
 *
 * Extracted from {@link createUserManager} so that unit tests can inspect
 * the derived settings without mocking the library.
 *
 * @param provider — the provider configuration to translate.
 * @returns a fully populated {@link UserManagerSettings} object.
 */
export function buildUserManagerSettings(
  provider: OAuthProviderConfig,
): UserManagerSettings {
  const storagePrefix = `${OIDC_STORAGE_KEY_PREFIX}${provider.id}.`
  const store =
    typeof window !== 'undefined' ? window.sessionStorage : undefined

  return {
    authority: provider.issuer,
    client_id: provider.clientId,
    redirect_uri: buildRedirectUri(provider.id),
    post_logout_redirect_uri: window.location.origin,
    response_type: OAUTH_RESPONSE_TYPE_CODE,
    scope: resolveScopes(provider).join(SCOPE_SEPARATOR),
    automaticSilentRenew: provider.silentRenew === true,
    // Persist interaction state and the authenticated user in
    // sessionStorage so the session is tab-scoped.
    stateStore: store
      ? new WebStorageStateStore({ store, prefix: storagePrefix })
      : undefined,
    userStore: store
      ? new WebStorageStateStore({ store, prefix: storagePrefix })
      : undefined,
  }
}

/**
 * Construct a new {@link UserManager} from a provider configuration.
 *
 * Prefer {@link getUserManager} in application code; this factory is
 * exported primarily for tests that want a fresh instance per case.
 *
 * @param provider — the provider configuration.
 * @returns a newly constructed `UserManager`.
 */
export function createUserManager(provider: OAuthProviderConfig): UserManager {
  return new UserManager(buildUserManagerSettings(provider))
}

/**
 * Return the memoised `UserManager` for a provider, constructing one on
 * first use.
 *
 * @param provider — the provider configuration.
 * @returns a `UserManager` suitable for sign-in / sign-out calls.
 */
export function getUserManager(provider: OAuthProviderConfig): UserManager {
  let manager = userManagerCache.get(provider.id)
  if (manager === undefined) {
    manager = createUserManager(provider)
    userManagerCache.set(provider.id, manager)
  }
  return manager
}

/**
 * Clear the in-memory `UserManager` cache. Intended for unit tests and
 * hot-reload scenarios where provider configuration may change between
 * calls.
 */
export function resetUserManagerCache(): void {
  userManagerCache.clear()
}

/**
 * Trigger a full-page redirect to the provider's authorisation endpoint.
 *
 * @param provider — the provider to sign in against.
 * @returns a promise that resolves once the redirect has been initiated.
 *   In practice the browser navigates away before the promise settles.
 */
export function signinRedirect(
  provider: OAuthProviderConfig,
): Promise<void> {
  return getUserManager(provider).signinRedirect()
}

/**
 * Process the OAuth2 authorisation-code callback, exchange the code for
 * tokens, and persist the resulting user.
 *
 * @param provider — the provider whose callback is being handled.
 * @param url — optional explicit callback URL. When omitted, the library
 *   uses `window.location.href`.
 * @returns the authenticated `User` on success.
 */
export function signinRedirectCallback(
  provider: OAuthProviderConfig,
  url?: string,
): Promise<User> {
  return getUserManager(provider).signinRedirectCallback(url)
}

/**
 * Trigger a full-page redirect to the provider's end-session endpoint,
 * if advertised, and locally clear the stored user.
 *
 * @param provider — the provider to sign out from.
 */
export function signoutRedirect(
  provider: OAuthProviderConfig,
): Promise<void> {
  return getUserManager(provider).signoutRedirect()
}

/**
 * Fetch the currently authenticated user from storage for the given
 * provider.
 *
 * @param provider — the provider whose session should be read.
 * @returns the stored `User`, or `null` when no valid session exists.
 */
export function getUser(
  provider: OAuthProviderConfig,
): Promise<User | null> {
  return getUserManager(provider).getUser()
}

/**
 * Remove the stored user for a provider without redirecting to the
 * end-session endpoint. Useful for local-only logouts or cleaning up
 * after a failed silent renew.
 *
 * @param provider — the provider whose cached user should be cleared.
 */
export function removeUser(provider: OAuthProviderConfig): Promise<void> {
  return getUserManager(provider).removeUser()
}
