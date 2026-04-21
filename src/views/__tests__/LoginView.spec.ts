/**
 * Component tests for {@link LoginView.vue}.
 *
 * Verifies the three render states and the post-mount redirect behaviour:
 *
 * - **No providers configured** → shows the "no providers" info alert and no
 *   sign-in buttons.
 * - **Providers configured** → renders exactly one "Sign in with &lt;provider&gt;"
 *   button per provider and delegates a click to
 *   {@link useAuthStore.login}.
 * - **Login error** → the store's `error` field is surfaced in a tonal
 *   `v-alert`.
 * - **Already authenticated** → `onMounted` replaces the current route with
 *   the preserved `returnTo` path (or `/` when none is set), clearing the
 *   `sessionStorage` entry in the process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import LoginView from '@/views/auth/LoginView.vue'
import en from '@/locales/en.json'
import { RETURN_TO_STORAGE_KEY } from '@/auth/constants'
import type { OAuthProviderConfig } from '@/auth/types'

/* ── Mock router ────────────────────────────────────────────────────── */

const mockReplace = vi.fn()
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ params: {} }),
}))

/* ── Mock auth store ────────────────────────────────────────────────── */

const mockLogin = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
const mockUseAuthStore = vi.mocked(useAuthStore)

/* ── Test fixtures ──────────────────────────────────────────────────── */

/** Default Keycloak provider used for most multi-provider scenarios. */
const KEYCLOAK_PROVIDER: OAuthProviderConfig = Object.freeze({
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
})

/** Second provider to exercise the multi-provider rendering. */
const AUTH0_PROVIDER: OAuthProviderConfig = Object.freeze({
  id: 'auth0',
  displayName: 'Auth0',
  issuer: 'https://example.auth0.com',
  clientId: 'fdsc-dashboard',
})

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Create a fresh i18n instance wired to the real `en.json` bundle. */
function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

/** Create a fresh Vuetify instance for component mounting. */
function createTestVuetify() {
  return createVuetify({ components, directives })
}

/**
 * Build a mock auth-store object compatible with the mocked
 * `useAuthStore()` return value. Only the fields the view touches are
 * populated.
 */
function createMockAuthState(overrides: {
  providers?: readonly OAuthProviderConfig[]
  isAuthEnabled?: boolean
  isAuthenticated?: boolean
  error?: string | null
} = {}) {
  const {
    providers = [],
    isAuthEnabled = providers.length > 0,
    isAuthenticated = false,
    error = null,
  } = overrides

  return {
    providers,
    isAuthEnabled,
    isAuthenticated,
    user: null,
    activeProviderId: null,
    status: 'idle' as const,
    error,
    isAdmin: false,
    isViewer: false,
    config: { providers },
    init: vi.fn().mockResolvedValue(undefined),
    login: mockLogin,
    handleCallback: vi.fn(),
    logout: vi.fn(),
    $reset: vi.fn(),
  }
}

/** Mount the LoginView with the full plugin stack and a mocked store. */
function mountLoginView(
  overrides: Parameters<typeof createMockAuthState>[0] = {},
): VueWrapper {
  const state = createMockAuthState(overrides)
  mockUseAuthStore.mockReturnValue(state as any)
  return mount(LoginView, {
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: { 'router-link': true },
    },
  })
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    window.sessionStorage.clear()
  })

  describe('rendering', () => {
    it('renders the sign-in heading and subtitle', () => {
      const wrapper = mountLoginView({ providers: [KEYCLOAK_PROVIDER] })
      expect(wrapper.text()).toContain('Sign in to the dashboard')
      expect(wrapper.text()).toContain('Choose an identity provider to continue.')
    })

    it('shows the "no providers" info alert when none are configured', () => {
      const wrapper = mountLoginView({ providers: [], isAuthEnabled: false })
      expect(wrapper.text()).toContain('No identity providers are configured.')
      // No per-provider button renders.
      expect(wrapper.text()).not.toContain('Sign in with')
    })

    it.each([
      ['single provider', [KEYCLOAK_PROVIDER]],
      ['multiple providers', [KEYCLOAK_PROVIDER, AUTH0_PROVIDER]],
    ])('renders one sign-in button per provider (%s)', (_label, providers) => {
      const wrapper = mountLoginView({ providers })
      for (const provider of providers) {
        expect(wrapper.text()).toContain(`Sign in with ${provider.displayName}`)
      }
      const buttons = wrapper
        .findAllComponents({ name: 'v-btn' })
        .filter((b) => b.text().startsWith('Sign in with '))
      expect(buttons).toHaveLength(providers.length)
    })

    it('surfaces the store error message in a tonal alert', () => {
      const wrapper = mountLoginView({
        providers: [KEYCLOAK_PROVIDER],
        error: 'invalid_request',
      })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('invalid_request')
    })
  })

  describe('sign-in action', () => {
    it('calls `store.login()` with the clicked provider id', async () => {
      mockLogin.mockResolvedValue(undefined)
      const wrapper = mountLoginView({
        providers: [KEYCLOAK_PROVIDER, AUTH0_PROVIDER],
      })

      const button = wrapper
        .findAllComponents({ name: 'v-btn' })
        .find((b) => b.text() === `Sign in with ${AUTH0_PROVIDER.displayName}`)
      expect(button).toBeDefined()
      await button!.trigger('click')
      await flushPromises()

      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockLogin).toHaveBeenCalledWith(AUTH0_PROVIDER.id)
    })

    it('swallows a failing login so the user can retry', async () => {
      mockLogin.mockRejectedValue(new Error('network down'))
      const wrapper = mountLoginView({ providers: [KEYCLOAK_PROVIDER] })
      const button = wrapper
        .findAllComponents({ name: 'v-btn' })
        .find((b) => b.text().startsWith('Sign in with '))
      expect(button).toBeDefined()

      // The click handler awaits the rejecting `login()` call internally
      // and must not propagate the error to the Vue error handler.
      await expect(async () => {
        await button!.trigger('click')
        await flushPromises()
      }).not.toThrow()

      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
  })

  describe('already authenticated', () => {
    it('redirects to the preserved returnTo path on mount', async () => {
      window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, '/policies/abc')
      mountLoginView({
        providers: [KEYCLOAK_PROVIDER],
        isAuthEnabled: true,
        isAuthenticated: true,
      })
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith('/policies/abc')
      expect(window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBeNull()
    })

    it('falls back to "/" when no returnTo is preserved', async () => {
      mountLoginView({
        providers: [KEYCLOAK_PROVIDER],
        isAuthEnabled: true,
        isAuthenticated: true,
      })
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('does not redirect when auth is disabled', async () => {
      mountLoginView({
        providers: [],
        isAuthEnabled: false,
        isAuthenticated: true, // mirrors the "auth disabled → admin" shortcut
      })
      await flushPromises()

      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('does not redirect when the user is not yet signed in', async () => {
      mountLoginView({
        providers: [KEYCLOAK_PROVIDER],
        isAuthEnabled: true,
        isAuthenticated: false,
      })
      await flushPromises()

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })
})
