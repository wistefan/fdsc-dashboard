/**
 * Unit tests for the `useAuth` composable.
 *
 * Covers:
 *   - `setToken` persistence behaviour in `localStorage`
 *   - `clearToken` equivalence to `setToken('')`
 *   - whitespace trimming
 *   - the reactive `isAuthenticated` computed
 *   - `initAuth` resolution order (localStorage → env → empty)
 *   - the synchronous `getAuthTokenSync` accessor
 *
 * The composable holds its token in module-level state, so each test re-imports
 * the module via `vi.resetModules()` + a dynamic `import()` to get a fresh
 * reactive ref and to pick up any freshly stubbed env variables.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/** localStorage key used by the composable to persist the JWT. */
const STORAGE_KEY = 'fdsc-dashboard-auth-token'

/**
 * Helper: load a fresh copy of the `useAuth` module. Required because the
 * composable stores its token in module-scoped state and we want every test to
 * start from an empty token.
 */
async function loadFreshModule() {
  vi.resetModules()
  return await import('@/composables/useAuth')
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
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

  describe('isAuthenticated', () => {
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
      // Guard: it really must not be a promise.
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
