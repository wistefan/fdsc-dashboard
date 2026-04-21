/**
 * Unit tests for the router-level authentication guard.
 *
 * Exercises the three branches of {@link authGuard}:
 *
 * - Auth disabled: the guard is a pass-through and performs no redirects
 *   or storage writes, preserving the legacy "no providers" behaviour.
 * - Auth enabled + user authenticated: the guard allows navigation to
 *   every route.
 * - Auth enabled + user unauthenticated: the guard redirects any
 *   non-public route to `/login` while preserving the originally
 *   requested path in `sessionStorage` under
 *   {@link RETURN_TO_STORAGE_KEY}.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'

import {
  LOGIN_ROUTE_PATH,
  RETURN_TO_STORAGE_KEY,
  RUNTIME_CONFIG_GLOBAL,
} from '@/auth/constants'

/* ── Mock the OIDC facade so the auth store is driveable in isolation ── */

const mockGetUser = vi.fn()
vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  signoutRedirect: vi.fn(),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  removeUser: vi.fn(),
}))

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Assign (or unassign) the runtime auth-config global so the next
 * `loadAuthConfig()` call reflects the desired provider configuration.
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

/** Build a minimal `RouteLocationNormalized` stub sufficient for the guard. */
function buildRoute(
  overrides: Partial<RouteLocationNormalized> = {},
): RouteLocationNormalized {
  return {
    fullPath: '/til',
    path: '/til',
    name: 'til-list',
    hash: '',
    query: {},
    params: {},
    matched: [],
    meta: {},
    redirectedFrom: undefined,
    ...overrides,
  } as RouteLocationNormalized
}

/** A fully-shaped Keycloak-style provider config usable as a test fixture. */
const KEYCLOAK_PROVIDER = {
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
}

/**
 * Re-import both the router module (which owns the guard) and the auth
 * store under a fresh module registry so every test gets a clean
 * `config` ref from `loadAuthConfig()`.
 */
async function freshRouter(): Promise<{
  authGuard: typeof import('@/router').authGuard
  useAuthStore: typeof import('@/stores/auth').useAuthStore
}> {
  vi.resetModules()
  setActivePinia(createPinia())
  const routerMod = await import('@/router')
  const storeMod = await import('@/stores/auth')
  return {
    authGuard: routerMod.authGuard,
    useAuthStore: storeMod.useAuthStore,
  }
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('authGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setRuntimeProviders(null)
    window.sessionStorage.clear()
  })

  afterEach(() => {
    setRuntimeProviders(null)
    window.sessionStorage.clear()
  })

  describe('auth disabled (no providers configured)', () => {
    beforeEach(() => {
      setRuntimeProviders([])
    })

    it.each([
      ['home', { name: 'home', path: '/', fullPath: '/' }],
      ['til-list', { name: 'til-list', path: '/til', fullPath: '/til' }],
      [
        'til-create',
        { name: 'til-create', path: '/til/new', fullPath: '/til/new' },
      ],
      [
        'policy-edit',
        {
          name: 'policy-edit',
          path: '/policies/1/edit',
          fullPath: '/policies/1/edit',
        },
      ],
    ])('lets the user navigate to %s unchanged', async (_label, target) => {
      const { authGuard, useAuthStore } = await freshRouter()
      useAuthStore() // instantiate so the store is live
      const next = vi.fn()
      authGuard(buildRoute(target), buildRoute(), next)
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith()
      expect(
        window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY),
      ).toBeNull()
    })
  })

  describe('auth enabled + authenticated user', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER])
    })

    it('allows navigation to any protected route', async () => {
      const { authGuard, useAuthStore } = await freshRouter()
      const store = useAuthStore()
      store.user = {
        subject: 'alice',
        name: 'Alice',
        role: 'admin',
        providerId: 'keycloak',
      }
      store.activeProviderId = 'keycloak'
      const next = vi.fn()
      authGuard(buildRoute({ name: 'til-list' }), buildRoute(), next)
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('auth enabled + unauthenticated user', () => {
    beforeEach(() => {
      setRuntimeProviders([KEYCLOAK_PROVIDER])
    })

    it.each([
      ['login', LOGIN_ROUTE_PATH, 'login'],
      ['callback', '/callback/keycloak', 'callback'],
    ])(
      'allows access to the public %s route without redirect',
      async (_label, fullPath, name) => {
        const { authGuard, useAuthStore } = await freshRouter()
        useAuthStore()
        const next = vi.fn()
        authGuard(buildRoute({ name, path: fullPath, fullPath }), buildRoute(), next)
        expect(next).toHaveBeenCalledWith()
        expect(
          window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY),
        ).toBeNull()
      },
    )

    it('redirects protected routes to /login and preserves the target', async () => {
      const { authGuard, useAuthStore } = await freshRouter()
      useAuthStore()
      const next = vi.fn()
      authGuard(
        buildRoute({
          name: 'til-detail',
          path: '/til/did:example:1',
          fullPath: '/til/did:example:1?tab=claims',
        }),
        buildRoute(),
        next,
      )
      expect(next).toHaveBeenCalledWith({ name: 'login' })
      expect(window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBe(
        '/til/did:example:1?tab=claims',
      )
    })

    it('does not overwrite returnTo when the target is /login itself', async () => {
      const { authGuard, useAuthStore } = await freshRouter()
      useAuthStore()
      window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, '/til')
      const next = vi.fn()
      authGuard(
        buildRoute({ name: 'login', path: LOGIN_ROUTE_PATH, fullPath: LOGIN_ROUTE_PATH }),
        buildRoute(),
        next,
      )
      expect(next).toHaveBeenCalledWith()
      expect(window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBe('/til')
    })
  })
})
