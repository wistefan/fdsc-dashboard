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
 * Unit tests for the auth Pinia store.
 *
 * Coverage:
 * - Initial state (auth disabled vs. enabled).
 * - `init()` session restoration across multiple providers.
 * - `login()` redirect dispatch and unknown-provider error path.
 * - `handleCallback()` success, failure, and unknown-provider path.
 * - `logout()` with / without an active provider, plus failure handling.
 * - Role resolution via the exported `resolveUserRole()` helper.
 * - `buildAuthenticatedUser()` claim mapping.
 * - `$reset()` restores initial state.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  DEFAULT_ROLES_CLAIM_PATH,
  ROLE_ADMIN,
  ROLE_VIEWER,
  RUNTIME_CONFIG_GLOBAL,
} from '@/auth/constants'
import type { OAuthProviderConfig } from '@/auth/types'

/* ── Mocks ─────────────────────────────────────────────────────────── */

const mockSigninRedirect = vi.fn()
const mockSigninRedirectCallback = vi.fn()
const mockSignoutRedirect = vi.fn()
const mockGetUser = vi.fn()
const mockRemoveUser = vi.fn()

vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: (...args: unknown[]) => mockSigninRedirect(...args),
  signinRedirectCallback: (...args: unknown[]) =>
    mockSigninRedirectCallback(...args),
  signoutRedirect: (...args: unknown[]) => mockSignoutRedirect(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  removeUser: (...args: unknown[]) => mockRemoveUser(...args),
}))

/* ── Test helpers ──────────────────────────────────────────────────── */

/** A syntactically complete provider with no optional fields. */
const KEYCLOAK_PROVIDER_RAW = {
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
}

/** A second provider so multi-provider scenarios can use two entries. */
const AUTH0_PROVIDER_RAW = {
  id: 'auth0',
  displayName: 'Auth0',
  issuer: 'https://example.auth0.com',
  clientId: 'fdsc-dashboard',
}

/**
 * Install a window-runtime config for the duration of a single test.
 * Because the store calls `loadAuthConfig()` inside its setup function,
 * the config must be in place *before* `useAuthStore()` is called.
 */
function setRuntimeProviders(providers: unknown[] | null): void {
  if (providers === null) {
    delete (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL]
  } else {
    (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL] = {
      providers,
    }
  }
}

/**
 * Build a minimal OIDC `User`-shaped object for test doubles.
 * `oidc-client-ts` is not loaded here, so we ship our own plain object.
 */
function buildCachedUser(opts: {
  expired?: boolean
  profile: Record<string, unknown>
}): { expired: boolean; profile: Record<string, unknown> } {
  return {
    expired: opts.expired ?? false,
    profile: opts.profile,
  }
}

/**
 * Load the store freshly for each test so the `config` ref is re-built
 * from the current runtime global. Uses `vi.resetModules()` to discard
 * any cached copy.
 */
async function freshStore(): Promise<
  ReturnType<typeof import('@/stores/auth').useAuthStore>
> {
  vi.resetModules()
  const mod = await import('@/stores/auth')
  setActivePinia(createPinia())
  return mod.useAuthStore()
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setRuntimeProviders(null)
  })

  afterEach(() => {
    setRuntimeProviders(null)
  })

  describe('initial state (auth disabled)', () => {
    beforeEach(() => {
      setRuntimeProviders([])
    })

    it('reports auth as disabled when no providers are configured', async () => {
      const store = await freshStore()
      expect(store.isAuthEnabled).toBe(false)
    })

    it('treats auth-disabled as authenticated / admin for backwards compat', async () => {
      const store = await freshStore()
      expect(store.isAuthenticated).toBe(true)
      expect(store.isAdmin).toBe(true)
      expect(store.isViewer).toBe(true)
    })

    it('init() is a no-op when auth is disabled', async () => {
      const store = await freshStore()
      await store.init()
      expect(mockGetUser).not.toHaveBeenCalled()
      expect(store.status).toBe('idle')
    })
  })

  describe('initial state (auth enabled)', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW, AUTH0_PROVIDER_RAW])
    })

    it('reports auth as enabled when at least one provider is configured', async () => {
      const store = await freshStore()
      expect(store.isAuthEnabled).toBe(true)
    })

    it('is not authenticated and not admin by default', async () => {
      const store = await freshStore()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isAdmin).toBe(false)
      expect(store.isViewer).toBe(false)
      expect(store.user).toBeNull()
      expect(store.status).toBe('idle')
      expect(store.error).toBeNull()
    })

    it('exposes the configured provider list via `providers`', async () => {
      const store = await freshStore()
      expect(store.providers.map((p) => p.id)).toEqual(['keycloak', 'auth0'])
    })
  })

  describe('init() session restoration', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW, AUTH0_PROVIDER_RAW])
    })

    it('restores the first non-expired cached user', async () => {
      mockGetUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          buildCachedUser({
            profile: {
              sub: 'bob',
              name: 'Bob Brown',
              realm_access: { roles: ['admin'] },
            },
          }),
        )
      const store = await freshStore()
      await store.init()
      expect(store.isAuthenticated).toBe(true)
      expect(store.activeProviderId).toBe('auth0')
      expect(store.user?.subject).toBe('bob')
      expect(store.user?.role).toBe(ROLE_ADMIN)
      expect(store.status).toBe('authenticated')
    })

    it('ignores expired cached users', async () => {
      mockGetUser
        .mockResolvedValueOnce(
          buildCachedUser({
            expired: true,
            profile: { sub: 'alice', realm_access: { roles: ['admin'] } },
          }),
        )
        .mockResolvedValueOnce(null)
      const store = await freshStore()
      await store.init()
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.activeProviderId).toBeNull()
      expect(store.status).toBe('idle')
    })

    it('continues to subsequent providers when one cache read throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockGetUser
        .mockRejectedValueOnce(new Error('corrupt storage'))
        .mockResolvedValueOnce(
          buildCachedUser({
            profile: { sub: 'bob', realm_access: { roles: ['viewer'] } },
          }),
        )
      const store = await freshStore()
      await store.init()
      expect(store.isAuthenticated).toBe(true)
      expect(store.activeProviderId).toBe('auth0')
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('login()', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('delegates to the OIDC sign-in redirect for the matching provider', async () => {
      mockSigninRedirect.mockResolvedValue(undefined)
      const store = await freshStore()
      await store.login('keycloak')
      expect(mockSigninRedirect).toHaveBeenCalledTimes(1)
      const [providerArg] = mockSigninRedirect.mock.calls[0] as [
        OAuthProviderConfig,
      ]
      expect(providerArg.id).toBe('keycloak')
      expect(store.status).toBe('authenticating')
      expect(store.activeProviderId).toBe('keycloak')
      expect(store.error).toBeNull()
    })

    it('rejects with an error when the provider id is unknown', async () => {
      const store = await freshStore()
      await expect(store.login('nope')).rejects.toThrow(
        'Unknown OAuth2 provider: nope',
      )
      expect(mockSigninRedirect).not.toHaveBeenCalled()
      expect(store.status).toBe('error')
      expect(store.error).toContain('Unknown OAuth2 provider')
    })

    it('records the error when the OIDC client throws', async () => {
      mockSigninRedirect.mockRejectedValue(new Error('network down'))
      const store = await freshStore()
      await expect(store.login('keycloak')).rejects.toThrow('network down')
      expect(store.status).toBe('error')
      expect(store.error).toBe('network down')
    })
  })

  describe('handleCallback()', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('exchanges the code and populates the user on success', async () => {
      mockSigninRedirectCallback.mockResolvedValue({
        profile: {
          sub: 'alice',
          name: 'Alice Anderson',
          email: 'alice@example.com',
          realm_access: { roles: ['admin', 'unrelated'] },
        },
      })
      const store = await freshStore()
      await store.handleCallback('keycloak', 'https://host/callback?code=x')
      expect(mockSigninRedirectCallback).toHaveBeenCalledTimes(1)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user).toEqual({
        subject: 'alice',
        name: 'Alice Anderson',
        email: 'alice@example.com',
        role: ROLE_ADMIN,
        providerId: 'keycloak',
      })
      expect(store.status).toBe('authenticated')
    })

    it('sets error status and rethrows when the exchange fails', async () => {
      mockSigninRedirectCallback.mockRejectedValue(
        new Error('invalid_grant'),
      )
      const store = await freshStore()
      await expect(
        store.handleCallback('keycloak'),
      ).rejects.toThrow('invalid_grant')
      expect(store.user).toBeNull()
      expect(store.status).toBe('error')
      expect(store.error).toBe('invalid_grant')
    })

    it('rejects with an error when the provider id is unknown', async () => {
      const store = await freshStore()
      await expect(store.handleCallback('nope')).rejects.toThrow(
        'Unknown OAuth2 provider: nope',
      )
      expect(mockSigninRedirectCallback).not.toHaveBeenCalled()
      expect(store.status).toBe('error')
    })
  })

  describe('logout()', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('clears local state when no provider is active', async () => {
      const store = await freshStore()
      store.user = {
        subject: 'x',
        name: 'X',
        role: ROLE_VIEWER,
        providerId: 'keycloak',
      }
      // `activeProviderId` is intentionally left null here.
      await store.logout()
      expect(store.user).toBeNull()
      expect(mockSignoutRedirect).not.toHaveBeenCalled()
    })

    it('delegates to the OIDC sign-out redirect when a provider is active', async () => {
      mockSignoutRedirect.mockResolvedValue(undefined)
      const store = await freshStore()
      store.user = {
        subject: 'x',
        name: 'X',
        role: ROLE_VIEWER,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      store.status = 'authenticated'
      await store.logout()
      expect(mockSignoutRedirect).toHaveBeenCalledTimes(1)
      expect(store.user).toBeNull()
      expect(store.activeProviderId).toBeNull()
      expect(store.status).toBe('idle')
    })

    it('clears local state and falls back to removeUser when sign-out fails', async () => {
      mockSignoutRedirect.mockRejectedValue(new Error('end-session down'))
      mockRemoveUser.mockResolvedValue(undefined)
      const store = await freshStore()
      store.user = {
        subject: 'x',
        name: 'X',
        role: ROLE_VIEWER,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      await expect(store.logout()).rejects.toThrow('end-session down')
      expect(mockRemoveUser).toHaveBeenCalledTimes(1)
      expect(store.user).toBeNull()
      expect(store.activeProviderId).toBeNull()
      expect(store.status).toBe('error')
    })
  })

  describe('$reset()', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('resets user, provider, status, and error to initial values', async () => {
      const store = await freshStore()
      store.user = {
        subject: 'x',
        name: 'X',
        role: ROLE_ADMIN,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      store.status = 'error'
      store.error = 'boom'
      store.$reset()
      expect(store.user).toBeNull()
      expect(store.activeProviderId).toBeNull()
      expect(store.status).toBe('idle')
      expect(store.error).toBeNull()
    })
  })
})

/* ── Role-resolution helper ────────────────────────────────────────── */

describe('resolveUserRole', () => {
  const BASE_PROVIDER: OAuthProviderConfig = {
    id: 'keycloak',
    displayName: 'Keycloak',
    issuer: 'https://id.example.com',
    clientId: 'fdsc-dashboard',
  }

  it.each([
    [
      'admin via default path (array)',
      BASE_PROVIDER,
      { realm_access: { roles: ['admin', 'offline_access'] } },
      ROLE_ADMIN,
    ],
    [
      'viewer via default path (array)',
      BASE_PROVIDER,
      { realm_access: { roles: ['viewer'] } },
      ROLE_VIEWER,
    ],
    [
      'space-separated string',
      BASE_PROVIDER,
      { realm_access: { roles: 'admin viewer' } },
      ROLE_ADMIN,
    ],
    [
      'falls back to viewer when no matching role is found',
      BASE_PROVIDER,
      { realm_access: { roles: ['some-other'] } },
      ROLE_VIEWER,
    ],
    [
      'falls back to viewer when the path is missing',
      BASE_PROVIDER,
      {},
      ROLE_VIEWER,
    ],
  ])('%s', async (_label, provider, claims, expected) => {
    const { resolveUserRole } = await import('@/stores/auth')
    expect(resolveUserRole(provider, claims)).toBe(expected)
  })

  it('honours a custom rolesClaimPath', async () => {
    const { resolveUserRole } = await import('@/stores/auth')
    const custom: OAuthProviderConfig = {
      ...BASE_PROVIDER,
      rolesClaimPath: 'resource_access.fdsc.roles',
    }
    const role = resolveUserRole(custom, {
      resource_access: { fdsc: { roles: ['admin'] } },
    })
    expect(role).toBe(ROLE_ADMIN)
  })

  it('applies roleMapping before the canonical filter', async () => {
    const { resolveUserRole } = await import('@/stores/auth')
    const mapped: OAuthProviderConfig = {
      ...BASE_PROVIDER,
      roleMapping: { 'dashboard-writer': ROLE_ADMIN },
    }
    const role = resolveUserRole(mapped, {
      realm_access: { roles: ['dashboard-writer'] },
    })
    expect(role).toBe(ROLE_ADMIN)
  })

  it('uses the default claim path constant when no override is given', async () => {
    const { resolveUserRole } = await import('@/stores/auth')
    // Placing the roles at the default path should resolve admin.
    const path = DEFAULT_ROLES_CLAIM_PATH.split('.')
    const claims: Record<string, unknown> = {}
    let cursor = claims
    for (let i = 0; i < path.length - 1; i += 1) {
      cursor[path[i]] = {}
      cursor = cursor[path[i]] as Record<string, unknown>
    }
    cursor[path[path.length - 1]] = ['admin']
    expect(resolveUserRole(BASE_PROVIDER, claims)).toBe(ROLE_ADMIN)
  })
})

describe('buildAuthenticatedUser', () => {
  const PROVIDER: OAuthProviderConfig = {
    id: 'keycloak',
    displayName: 'Keycloak',
    issuer: 'https://id.example.com',
    clientId: 'fdsc-dashboard',
  }

  it('maps profile claims to the dashboard user shape', async () => {
    const { buildAuthenticatedUser } = await import('@/stores/auth')
    const user = buildAuthenticatedUser(PROVIDER, {
      profile: {
        sub: 'alice',
        name: 'Alice',
        email: 'a@e.com',
        realm_access: { roles: ['admin'] },
      },
    } as unknown as import('oidc-client-ts').User)
    expect(user).toEqual({
      subject: 'alice',
      name: 'Alice',
      email: 'a@e.com',
      role: ROLE_ADMIN,
      providerId: 'keycloak',
    })
  })

  it('falls back to preferred_username then a placeholder when name is missing', async () => {
    const { buildAuthenticatedUser } = await import('@/stores/auth')
    const withPreferred = buildAuthenticatedUser(PROVIDER, {
      profile: { sub: 'x', preferred_username: 'xx' },
    } as unknown as import('oidc-client-ts').User)
    expect(withPreferred.name).toBe('xx')

    const withNeither = buildAuthenticatedUser(PROVIDER, {
      profile: { sub: 'x' },
    } as unknown as import('oidc-client-ts').User)
    expect(withNeither.name).toBe('Unknown user')
    expect(withNeither.email).toBeUndefined()
  })
})
