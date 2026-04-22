import { computed, ref, type ComputedRef } from 'vue'

/** localStorage key for persisting the current JWT. */
export const AUTH_TOKEN_STORAGE_KEY = 'fdsc-dashboard-auth-token'

/**
 * Name of the build-time environment variable that may seed the JWT.
 * Exported for documentation purposes only; the value is read via
 * `import.meta.env.VITE_AUTH_TOKEN` so Vite's static replacement works.
 */
export const AUTH_TOKEN_ENV_KEY = 'VITE_AUTH_TOKEN'

/**
 * Reactive holder for the current JWT. An empty string means the user is
 * unauthenticated and no `Authorization` header should be emitted.
 * Declared at module scope so every caller of `useAuth()` observes the
 * same state.
 */
const tokenState = ref<string>('')

/**
 * Public, reactive API for the application's authentication token.
 *
 * The token is mirrored into `localStorage` so it survives reloads, and can be
 * seeded at build time through the `VITE_AUTH_TOKEN` env var.
 *
 * @returns Reactive `token` and `isAuthenticated` refs plus `setToken`,
 *   `clearToken`, `initAuth`, and a synchronous `getAuthTokenSync` getter.
 */
export function useAuth() {
  /** The current JWT as a reactive computed ref. Empty string when unauthenticated. */
  const token: ComputedRef<string> = computed(() => tokenState.value)

  /** `true` iff a non-empty JWT is currently configured. */
  const isAuthenticated: ComputedRef<boolean> = computed(() => tokenState.value.length > 0)

  /**
   * Replace the current JWT. Whitespace is trimmed. Non-empty values are
   * persisted to `localStorage`; empty values remove the stored entry.
   *
   * @param value - The new JWT, or an empty string to clear the token.
   */
  function setToken(value: string): void {
    const trimmed = value.trim()
    tokenState.value = trimmed
    if (trimmed.length > 0) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }
  }

  /**
   * Clear the current JWT. Equivalent to `setToken('')`.
   */
  function clearToken(): void {
    setToken('')
  }

  /**
   * Initialise the token state. Resolution order:
   *   1. `localStorage` entry under {@link AUTH_TOKEN_STORAGE_KEY}.
   *   2. `import.meta.env.VITE_AUTH_TOKEN` when non-empty.
   *   3. No-op (token stays empty).
   *
   * Intended to be called once during application startup.
   */
  function initAuth(): void {
    const stored = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    if (stored && stored.length > 0) {
      tokenState.value = stored
      return
    }
    const fromEnv = import.meta.env.VITE_AUTH_TOKEN
    if (typeof fromEnv === 'string' && fromEnv.length > 0) {
      tokenState.value = fromEnv
      // Do not persist env-provided tokens — they are controlled by the build
      // environment, not by the user.
      return
    }
    tokenState.value = ''
  }

  return {
    token,
    isAuthenticated,
    setToken,
    clearToken,
    initAuth,
    getAuthTokenSync,
  }
}

/**
 * Non-reactive accessor for the current JWT. Safe to call from outside a
 * component setup context (e.g. from the generated API-client token resolver).
 *
 * @returns The current JWT, or an empty string when unauthenticated.
 */
export function getAuthTokenSync(): string {
  return tokenState.value
}
