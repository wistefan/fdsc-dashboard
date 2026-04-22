/**
 * Unit tests for `src/api/config.ts`.
 *
 * Covers:
 *   - Every generated OpenAPI client's `BASE` is sourced from its
 *     `VITE_*_API_URL` env var or its default `/api/*` proxy prefix.
 *   - Every generated OpenAPI client's `TOKEN` is set to the **same**
 *     `authTokenResolver` function reference.
 *   - The resolver resolves to whatever `getAuthTokenSync` currently returns,
 *     propagating the empty-string case used to suppress the `Authorization`
 *     header.
 *
 * `@/composables/useAuth` is mocked so `getAuthTokenSync` is controllable from
 * each test without touching module-scoped reactive state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* ── Controllable mock for the auth composable ─────────────────────── */

/**
 * Holds the value returned by the mocked `getAuthTokenSync`. Tests mutate this
 * between assertions rather than re-mocking the module, so the resolver
 * captured during `configureApiClients()` keeps working.
 */
const mockTokenHolder = { value: '' }

vi.mock('@/composables/useAuth', () => ({
  getAuthTokenSync: () => mockTokenHolder.value,
}))

/* ── Imports under test ─────────────────────────────────────────────── */

import { configureApiClients, authTokenResolver } from '@/api/config'
import { OpenAPI as TilOpenAPI } from '@/api/generated/til'
import { OpenAPI as TirOpenAPI } from '@/api/generated/tir'
import { OpenAPI as CcsOpenAPI } from '@/api/generated/ccs'
import { OpenAPI as OdrlOpenAPI } from '@/api/generated/odrl'

/* ── Test fixtures ─────────────────────────────────────────────────── */

/**
 * The four generated OpenAPI client singletons paired with their short name.
 * Used by `it.each` blocks so every client is asserted with a single test case.
 */
const CLIENTS = [
  ['til', TilOpenAPI] as const,
  ['tir', TirOpenAPI] as const,
  ['ccs', CcsOpenAPI] as const,
  ['odrl', OdrlOpenAPI] as const,
]

/** Default proxy prefixes that match the values in `src/api/config.ts`. */
const DEFAULT_BASES = {
  til: '/api/til',
  tir: '/api/tir',
  ccs: '/api/ccs',
  odrl: '/api/odrl',
} as const

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('configureApiClients', () => {
  beforeEach(() => {
    mockTokenHolder.value = ''
    vi.unstubAllEnvs()
    // Reset the client singletons to a known state so leaked env-var stubs
    // from earlier tests cannot contaminate this one.
    TilOpenAPI.BASE = ''
    TirOpenAPI.BASE = ''
    CcsOpenAPI.BASE = ''
    OdrlOpenAPI.BASE = ''
    TilOpenAPI.TOKEN = undefined
    TirOpenAPI.TOKEN = undefined
    CcsOpenAPI.TOKEN = undefined
    OdrlOpenAPI.TOKEN = undefined
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('BASE URL configuration', () => {
    it.each(CLIENTS)(
      'falls back to the default proxy prefix for the %s client when the env var is unset',
      (name, client) => {
        configureApiClients()
        expect(client.BASE).toBe(DEFAULT_BASES[name])
      },
    )

    it('uses VITE_*_API_URL env vars when provided', () => {
      vi.stubEnv('VITE_TIL_API_URL', 'https://til.example.com')
      vi.stubEnv('VITE_TIR_API_URL', 'https://tir.example.com')
      vi.stubEnv('VITE_CCS_API_URL', 'https://ccs.example.com')
      vi.stubEnv('VITE_ODRL_API_URL', 'https://odrl.example.com')

      configureApiClients()

      expect(TilOpenAPI.BASE).toBe('https://til.example.com')
      expect(TirOpenAPI.BASE).toBe('https://tir.example.com')
      expect(CcsOpenAPI.BASE).toBe('https://ccs.example.com')
      expect(OdrlOpenAPI.BASE).toBe('https://odrl.example.com')
    })
  })

  describe('TOKEN resolver wiring', () => {
    it.each(CLIENTS)(
      'installs the shared authTokenResolver on the %s client',
      (_name, client) => {
        configureApiClients()
        expect(client.TOKEN).toBe(authTokenResolver)
      },
    )

    it('wires the same function reference into every client', () => {
      configureApiClients()

      expect(TilOpenAPI.TOKEN).toBe(authTokenResolver)
      expect(TirOpenAPI.TOKEN).toBe(authTokenResolver)
      expect(CcsOpenAPI.TOKEN).toBe(authTokenResolver)
      expect(OdrlOpenAPI.TOKEN).toBe(authTokenResolver)

      // Transitive: all four TOKENs are strictly equal to each other.
      expect(TilOpenAPI.TOKEN).toBe(TirOpenAPI.TOKEN)
      expect(TirOpenAPI.TOKEN).toBe(CcsOpenAPI.TOKEN)
      expect(CcsOpenAPI.TOKEN).toBe(OdrlOpenAPI.TOKEN)
    })
  })

  describe('authTokenResolver behaviour', () => {
    it.each([
      ['non-empty JWT', 'abc.def.ghi', 'abc.def.ghi'],
      ['empty string suppresses the Authorization header', '', ''],
    ])('resolves to the current getAuthTokenSync value — %s', async (_label, mocked, expected) => {
      mockTokenHolder.value = mocked

      const resolved = await authTokenResolver()

      expect(resolved).toBe(expected)
    })

    it('re-reads getAuthTokenSync on every invocation', async () => {
      mockTokenHolder.value = 'first'
      expect(await authTokenResolver()).toBe('first')

      mockTokenHolder.value = 'second'
      expect(await authTokenResolver()).toBe('second')

      mockTokenHolder.value = ''
      expect(await authTokenResolver()).toBe('')
    })

    it('returns a Promise<string>', () => {
      mockTokenHolder.value = 'jwt'
      const returned = authTokenResolver()

      expect(returned).toBeInstanceOf(Promise)
      return expect(returned).resolves.toBe('jwt')
    })
  })
})
