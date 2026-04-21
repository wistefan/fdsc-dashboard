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
 * Unit tests for the `useAuth` composable.
 *
 * The composable exposes two complementary APIs:
 *  - Token-based: `token`, `setToken`, `clearToken`, `initAuth`,
 *    `getAuthTokenSync`, plus token-backed `isAuthenticated`.
 *  - Role-based: `isAdmin`, `isViewer`, `canEdit`, `canDelete`,
 *    `isAuthEnabled`, backed by the OAuth2 auth Pinia store.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  ROLE_ADMIN,
  ROLE_VIEWER,
  RUNTIME_CONFIG_GLOBAL,
} from '@/auth/constants'

/** localStorage key used by the composable to persist the JWT. */
const STORAGE_KEY = 'fdsc-dashboard-auth-token'

vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  signoutRedirect: vi.fn(),
  getUser: vi.fn(),
  removeUser: vi.fn(),
}))

/** A syntactically complete provider with no optional fields. */
const KEYCLOAK_PROVIDER_RAW = {
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
}

/** Assign (or unassign) the runtime auth-config global. */
function setRuntimeProviders(providers: unknown[] | null): void {
  if (providers === null) {
    delete (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL]
  } else {
    ;(window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL] = {
      providers,
    }
  }
}

/**
 * Helper: load a fresh copy of the `useAuth` module. Required because the
 * composable stores its token in module-scoped state and we want every test to
 * start from an empty token. Installs a fresh Pinia so role-based flags work.
 */
async function loadFreshModule() {
  vi.resetModules()
  setActivePinia(createPinia())
  return await import('@/composables/useAuth')
}

/** Re-import both the auth store and the composable under a fresh registry. */
async function freshComposable(): Promise<{
  useAuth: typeof import('@/composables/useAuth').useAuth
  useAuthStore: typeof import('@/stores/auth').useAuthStore
}> {
  vi.resetModules()
  setActivePinia(createPinia())
  const storeMod = await import('@/stores/auth')
  const composableMod = await import('@/composables/useAuth')
  return {
    useAuth: composableMod.useAuth,
    useAuthStore: storeMod.useAuthStore,
  }
}

describe('useAuth — token-based API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
    setActivePinia(createPinia())
    setRuntimeProviders(null)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
    setRuntimeProviders(null)
  })

  describe('setToken', () => {
    it('stores a non-empty token in localStorage under the expected key', async () => {
      const { useAuth } = await loadFreshModule()
      const { setToken, token } = useAuth()

      setToken('abc.def.ghi')

      expect(token.value).toBe('abc.def.ghi')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('abc.def.ghi')
    })

    it('removes the localStorage entry when called with an empty string', async () => {
      const { useAuth } = await loadFreshModule()
      const { setToken, token } = useAuth()

      setToken('abc')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('abc')

      setToken('')

      expect(token.value).toBe('')
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it.each([
      ['leading whitespace', '   abc', 'abc'],
      ['trailing whitespace', 'abc   ', 'abc'],
      ['surrounding whitespace', '  abc  ', 'abc'],
      ['whitespace only becomes empty', '   ', ''],
    ])('trims %s', async (_label, input, expected) => {
      const { useAuth } = await loadFreshModule()
      const { setToken, token } = useAuth()

      setToken(input)

      expect(token.value).toBe(expected)
      if (expected.length > 0) {
        expect(localStorage.getItem(STORAGE_KEY)).toBe(expected)
      } else {
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }
    })
  })

  describe('clearToken', () => {
    it('is equivalent to setToken("")', async () => {
      const { useAuth } = await loadFreshModule()
      const { setToken, clearToken, token } = useAuth()

      setToken('abc')
      expect(token.value).toBe('abc')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('abc')

      clearToken()

      expect(token.value).toBe('')
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('isAuthenticated (token-backed when auth is disabled)', () => {
    it.each([
      ['empty token', '', false],
      ['non-empty token', 'jwt', true],
    ])('is %s → %s', async (_label, tokenValue, expected) => {
      const { useAuth } = await loadFreshModule()
      const { setToken, isAuthenticated } = useAuth()

      setToken(tokenValue)

      expect(isAuthenticated.value).toBe(expected)
    })

    it('reacts to subsequent setToken/clearToken calls', async () => {
      const { useAuth } = await loadFreshModule()
      const { setToken, clearToken, isAuthenticated } = useAuth()

      expect(isAuthenticated.value).toBe(false)

      setToken('jwt')
      expect(isAuthenticated.value).toBe(true)

      clearToken()
      expect(isAuthenticated.value).toBe(false)
    })
  })

  describe('initAuth', () => {
    it('restores a token persisted in localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'persisted.jwt')
      const { useAuth } = await loadFreshModule()
      const { initAuth, token } = useAuth()

      initAuth()

      expect(token.value).toBe('persisted.jwt')
    })

    it('falls back to VITE_AUTH_TOKEN when localStorage is empty', async () => {
      vi.stubEnv('VITE_AUTH_TOKEN', 'env.jwt.value')
      const { useAuth } = await loadFreshModule()
      const { initAuth, token } = useAuth()

      initAuth()

      expect(token.value).toBe('env.jwt.value')
    })

    it('prefers localStorage over VITE_AUTH_TOKEN when both are set', async () => {
      localStorage.setItem(STORAGE_KEY, 'persisted.jwt')
      vi.stubEnv('VITE_AUTH_TOKEN', 'env.jwt.value')
      const { useAuth } = await loadFreshModule()
      const { initAuth, token } = useAuth()

      initAuth()

      expect(token.value).toBe('persisted.jwt')
    })

    it('leaves the token empty when neither source is configured', async () => {
      const { useAuth } = await loadFreshModule()
      const { initAuth, token, isAuthenticated } = useAuth()

      initAuth()

      expect(token.value).toBe('')
      expect(isAuthenticated.value).toBe(false)
    })

    it('does not persist an env-seeded token to localStorage', async () => {
      vi.stubEnv('VITE_AUTH_TOKEN', 'env.jwt.value')
      const { useAuth } = await loadFreshModule()
      const { initAuth } = useAuth()

      initAuth()

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('getAuthTokenSync', () => {
    it('returns the current token synchronously (no promise)', async () => {
      const { useAuth, getAuthTokenSync } = await loadFreshModule()
      const { setToken } = useAuth()

      setToken('abc.def')

      const result = getAuthTokenSync()
      expect(result).toBe('abc.def')
      expect(typeof result).toBe('string')
      expect((result as unknown as { then?: unknown }).then).toBeUndefined()
    })

    it('returns an empty string when no token is configured', async () => {
      const { getAuthTokenSync } = await loadFreshModule()

      expect(getAuthTokenSync()).toBe('')
    })

    it('reflects the latest value after setToken/clearToken', async () => {
      const { useAuth, getAuthTokenSync } = await loadFreshModule()
      const { setToken, clearToken } = useAuth()

      setToken('one')
      expect(getAuthTokenSync()).toBe('one')

      setToken('two')
      expect(getAuthTokenSync()).toBe('two')

      clearToken()
      expect(getAuthTokenSync()).toBe('')
    })
  })

  describe('exported constants', () => {
    it('exposes the localStorage key and env-var name as documented', async () => {
      const mod = await loadFreshModule()

      expect(mod.AUTH_TOKEN_STORAGE_KEY).toBe(STORAGE_KEY)
      expect(mod.AUTH_TOKEN_ENV_KEY).toBe('VITE_AUTH_TOKEN')
    })
  })
})

describe('useAuth — role-based API', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setRuntimeProviders(null)
  })

  afterEach(() => {
    localStorage.clear()
    setRuntimeProviders(null)
  })

  describe('auth disabled (no providers configured)', () => {
    beforeEach(() => {
      setRuntimeProviders([])
    })

    it('reports every role capability flag as true', async () => {
      const { useAuth } = await freshComposable()
      const auth = useAuth()
      expect(auth.isAdmin.value).toBe(true)
      expect(auth.isViewer.value).toBe(true)
      expect(auth.canEdit.value).toBe(true)
      expect(auth.canDelete.value).toBe(true)
      expect(auth.isAuthEnabled.value).toBe(false)
    })
  })

  describe('auth enabled + viewer signed in', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('grants viewer privileges but denies edit/delete', async () => {
      const { useAuth, useAuthStore } = await freshComposable()
      const store = useAuthStore()
      store.user = {
        subject: 'bob',
        name: 'Bob',
        role: ROLE_VIEWER,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      const auth = useAuth()
      expect(auth.isAuthEnabled.value).toBe(true)
      expect(auth.isAuthenticated.value).toBe(true)
      expect(auth.isViewer.value).toBe(true)
      expect(auth.isAdmin.value).toBe(false)
      expect(auth.canEdit.value).toBe(false)
      expect(auth.canDelete.value).toBe(false)
    })
  })

  describe('auth enabled + admin signed in', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('grants every capability flag', async () => {
      const { useAuth, useAuthStore } = await freshComposable()
      const store = useAuthStore()
      store.user = {
        subject: 'alice',
        name: 'Alice',
        role: ROLE_ADMIN,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      const auth = useAuth()
      expect(auth.isAuthEnabled.value).toBe(true)
      expect(auth.isAuthenticated.value).toBe(true)
      expect(auth.isAdmin.value).toBe(true)
      expect(auth.isViewer.value).toBe(true)
      expect(auth.canEdit.value).toBe(true)
      expect(auth.canDelete.value).toBe(true)
    })
  })

  describe('auth enabled + no user signed in', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('denies every capability flag', async () => {
      const { useAuth } = await freshComposable()
      const auth = useAuth()
      expect(auth.isAuthEnabled.value).toBe(true)
      expect(auth.isAuthenticated.value).toBe(false)
      expect(auth.isAdmin.value).toBe(false)
      expect(auth.isViewer.value).toBe(false)
      expect(auth.canEdit.value).toBe(false)
      expect(auth.canDelete.value).toBe(false)
    })
  })

  describe('reactivity', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER_RAW])
    })

    it('tracks subsequent role changes on the store', async () => {
      const { useAuth, useAuthStore } = await freshComposable()
      const store = useAuthStore()
      const auth = useAuth()

      expect(auth.canEdit.value).toBe(false)

      store.user = {
        subject: 'carol',
        name: 'Carol',
        role: ROLE_ADMIN,
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      expect(auth.canEdit.value).toBe(true)

      store.user = {
        subject: 'carol',
        name: 'Carol',
        role: ROLE_VIEWER,
        providerId: 'keycloak',
      }
      expect(auth.canEdit.value).toBe(false)
    })
  })
})
