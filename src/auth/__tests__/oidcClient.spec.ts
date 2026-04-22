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
 * Unit tests for the OIDC client wrapper.
 *
 * `oidc-client-ts` is mocked so the tests can inspect the settings passed
 * to `UserManager` without performing any real network requests. The
 * wrapper's public surface is exercised through:
 *
 * - `buildRedirectUri()` — derives callback URL from `window.location.origin`.
 * - `buildUserManagerSettings()` — translates `OAuthProviderConfig` into
 *   the options that `UserManager` expects.
 * - `createUserManager()` / `getUserManager()` — instantiate and memoise.
 * - The sign-in / sign-out / user helpers forward to the same cached
 *   `UserManager` instance.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OAuthProviderConfig } from '@/auth/types'
import {
  CALLBACK_ROUTE_PREFIX,
  DEFAULT_OAUTH_SCOPES,
  OAUTH_RESPONSE_TYPE_CODE,
  OIDC_STORAGE_KEY_PREFIX,
} from '@/auth/constants'

/* ── Mock oidc-client-ts ────────────────────────────────────────────── */

/**
 * Captures the settings passed to each `UserManager` constructor call so
 * the assertions can inspect them without touching the real library.
 */
const userManagerConstructor = vi.fn()

/**
 * Mock `UserManager` instance. Every wrapper method delegates to one of
 * these spies so tests can verify forwarding without reimplementing the
 * library's behaviour.
 */
const mockUserManagerInstance = {
  signinRedirect: vi.fn().mockResolvedValue(undefined),
  signinRedirectCallback: vi
    .fn()
    .mockResolvedValue({ profile: { sub: 'alice' } }),
  signoutRedirect: vi.fn().mockResolvedValue(undefined),
  getUser: vi.fn().mockResolvedValue(null),
  removeUser: vi.fn().mockResolvedValue(undefined),
}

/**
 * Captures constructor calls to `WebStorageStateStore` so the tests can
 * confirm the expected prefix / backing store.
 */
const webStorageStateStoreConstructor = vi.fn()

vi.mock('oidc-client-ts', () => {
  /**
   * Stand-in class for `UserManager`. Uses a real class so the `new`
   * operator works; the constructor forwards its argument to the
   * {@link userManagerConstructor} spy and returns the shared mock
   * instance instead of a fresh object (via the `return` trick that the
   * language allows from inside a constructor).
   */
  class MockUserManager {
    constructor(settings: unknown) {
      userManagerConstructor(settings)
      return mockUserManagerInstance as unknown as MockUserManager
    }
  }

  /** Stand-in class for `WebStorageStateStore`. */
  class MockWebStorageStateStore {
    public readonly prefix?: string
    public readonly store?: unknown
    constructor(args: { prefix?: string; store?: unknown }) {
      webStorageStateStoreConstructor(args)
      this.prefix = args.prefix
      this.store = args.store
    }
  }

  return {
    UserManager: MockUserManager,
    WebStorageStateStore: MockWebStorageStateStore,
    User: class User {},
  }
})

/* ── Test helpers ───────────────────────────────────────────────────── */

/** A structurally valid provider used as the baseline for most tests. */
const BASE_PROVIDER: OAuthProviderConfig = Object.freeze({
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
})

/** Expected redirect URI for {@link BASE_PROVIDER} in the jsdom test env. */
const BASE_EXPECTED_REDIRECT = `${window.location.origin}${CALLBACK_ROUTE_PREFIX}${BASE_PROVIDER.id}`

/* ── Tests ──────────────────────────────────────────────────────────── */

describe('oidcClient', () => {
  beforeEach(async () => {
    userManagerConstructor.mockClear()
    webStorageStateStoreConstructor.mockClear()
    mockUserManagerInstance.signinRedirect.mockClear()
    mockUserManagerInstance.signinRedirectCallback.mockClear()
    mockUserManagerInstance.signoutRedirect.mockClear()
    mockUserManagerInstance.getUser.mockClear()
    mockUserManagerInstance.removeUser.mockClear()
    const mod = await import('@/auth/oidcClient')
    mod.resetUserManagerCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('buildRedirectUri', () => {
    it('derives the callback URL from window.location.origin', async () => {
      const { buildRedirectUri } = await import('@/auth/oidcClient')
      expect(buildRedirectUri('keycloak')).toBe(BASE_EXPECTED_REDIRECT)
    })

    it('URL-safely interpolates the provider id into the callback path', async () => {
      const { buildRedirectUri } = await import('@/auth/oidcClient')
      expect(buildRedirectUri('auth0')).toBe(
        `${window.location.origin}/callback/auth0`,
      )
    })
  })

  describe('buildUserManagerSettings', () => {
    it('maps provider fields to UserManagerSettings 1:1', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      const settings = buildUserManagerSettings(BASE_PROVIDER)
      expect(settings.authority).toBe(BASE_PROVIDER.issuer)
      expect(settings.client_id).toBe(BASE_PROVIDER.clientId)
      expect(settings.redirect_uri).toBe(BASE_EXPECTED_REDIRECT)
      expect(settings.response_type).toBe(OAUTH_RESPONSE_TYPE_CODE)
    })

    it('falls back to DEFAULT_OAUTH_SCOPES when no scopes are configured', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      const settings = buildUserManagerSettings(BASE_PROVIDER)
      expect(settings.scope).toBe(DEFAULT_OAUTH_SCOPES.join(' '))
    })

    it('joins configured scopes with a single space', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      const provider: OAuthProviderConfig = {
        ...BASE_PROVIDER,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
      }
      const settings = buildUserManagerSettings(provider)
      expect(settings.scope).toBe('openid profile email offline_access')
    })

    it.each([
      ['silentRenew omitted', undefined, false],
      ['silentRenew false', false, false],
      ['silentRenew true', true, true],
    ])(
      'wires automaticSilentRenew when %s',
      async (_label, silentRenew, expected) => {
        const { buildUserManagerSettings } = await import(
          '@/auth/oidcClient'
        )
        const provider: OAuthProviderConfig = silentRenew === undefined
          ? BASE_PROVIDER
          : { ...BASE_PROVIDER, silentRenew }
        const settings = buildUserManagerSettings(provider)
        expect(settings.automaticSilentRenew).toBe(expected)
      },
    )

    it('uses sessionStorage-backed WebStorageStateStore with a provider-scoped prefix', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      buildUserManagerSettings(BASE_PROVIDER)
      const expectedPrefix = `${OIDC_STORAGE_KEY_PREFIX}${BASE_PROVIDER.id}.`
      expect(webStorageStateStoreConstructor).toHaveBeenCalled()
      for (const call of webStorageStateStoreConstructor.mock.calls) {
        const [args] = call as [{ prefix: string; store: unknown }]
        expect(args.prefix).toBe(expectedPrefix)
        expect(args.store).toBe(window.sessionStorage)
      }
    })

    it('namespaces storage per provider to avoid cross-provider collisions', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      buildUserManagerSettings(BASE_PROVIDER)
      buildUserManagerSettings({ ...BASE_PROVIDER, id: 'auth0' })
      const prefixes = webStorageStateStoreConstructor.mock.calls.map(
        (c) => (c as [{ prefix: string }])[0].prefix,
      )
      expect(prefixes).toContain(`${OIDC_STORAGE_KEY_PREFIX}keycloak.`)
      expect(prefixes).toContain(`${OIDC_STORAGE_KEY_PREFIX}auth0.`)
    })

    it('sets post_logout_redirect_uri to window.location.origin', async () => {
      const { buildUserManagerSettings } = await import('@/auth/oidcClient')
      const settings = buildUserManagerSettings(BASE_PROVIDER)
      expect(settings.post_logout_redirect_uri).toBe(
        window.location.origin,
      )
    })
  })

  describe('createUserManager', () => {
    it('constructs a UserManager using the derived settings', async () => {
      const { createUserManager } = await import('@/auth/oidcClient')
      createUserManager(BASE_PROVIDER)
      expect(userManagerConstructor).toHaveBeenCalledTimes(1)
      const [settings] = userManagerConstructor.mock.calls[0]
      expect(settings).toMatchObject({
        authority: BASE_PROVIDER.issuer,
        client_id: BASE_PROVIDER.clientId,
        redirect_uri: BASE_EXPECTED_REDIRECT,
        response_type: OAUTH_RESPONSE_TYPE_CODE,
        scope: DEFAULT_OAUTH_SCOPES.join(' '),
      })
    })
  })

  describe('getUserManager (memoisation)', () => {
    it('returns the same UserManager instance on repeated calls', async () => {
      const { getUserManager } = await import('@/auth/oidcClient')
      const first = getUserManager(BASE_PROVIDER)
      const second = getUserManager(BASE_PROVIDER)
      expect(first).toBe(second)
      expect(userManagerConstructor).toHaveBeenCalledTimes(1)
    })

    it('creates a separate UserManager per provider id', async () => {
      const { getUserManager } = await import('@/auth/oidcClient')
      getUserManager(BASE_PROVIDER)
      getUserManager({ ...BASE_PROVIDER, id: 'auth0' })
      expect(userManagerConstructor).toHaveBeenCalledTimes(2)
    })

    it('resetUserManagerCache() discards all cached instances', async () => {
      const { getUserManager, resetUserManagerCache } = await import(
        '@/auth/oidcClient'
      )
      getUserManager(BASE_PROVIDER)
      resetUserManagerCache()
      getUserManager(BASE_PROVIDER)
      expect(userManagerConstructor).toHaveBeenCalledTimes(2)
    })
  })

  describe('signin / signout helpers', () => {
    it('signinRedirect delegates to UserManager.signinRedirect', async () => {
      const { signinRedirect } = await import('@/auth/oidcClient')
      await signinRedirect(BASE_PROVIDER)
      expect(mockUserManagerInstance.signinRedirect).toHaveBeenCalledTimes(1)
    })

    it('signinRedirectCallback forwards the URL argument', async () => {
      const { signinRedirectCallback } = await import('@/auth/oidcClient')
      const url = 'https://app.example.com/callback/keycloak?code=xyz&state=abc'
      await signinRedirectCallback(BASE_PROVIDER, url)
      expect(
        mockUserManagerInstance.signinRedirectCallback,
      ).toHaveBeenCalledWith(url)
    })

    it('signoutRedirect delegates to UserManager.signoutRedirect', async () => {
      const { signoutRedirect } = await import('@/auth/oidcClient')
      await signoutRedirect(BASE_PROVIDER)
      expect(mockUserManagerInstance.signoutRedirect).toHaveBeenCalledTimes(1)
    })

    it('getUser returns whatever UserManager.getUser resolves to', async () => {
      const { getUser } = await import('@/auth/oidcClient')
      mockUserManagerInstance.getUser.mockResolvedValueOnce({
        profile: { sub: 'bob' },
      })
      const user = await getUser(BASE_PROVIDER)
      expect(user).toEqual({ profile: { sub: 'bob' } })
    })

    it('removeUser delegates to UserManager.removeUser', async () => {
      const { removeUser } = await import('@/auth/oidcClient')
      await removeUser(BASE_PROVIDER)
      expect(mockUserManagerInstance.removeUser).toHaveBeenCalledTimes(1)
    })
  })
})
