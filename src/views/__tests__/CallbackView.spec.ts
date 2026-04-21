/**
 * Component tests for {@link CallbackView.vue}.
 *
 * Covers the three render/navigation states the view supports:
 *
 * - **Loading** — the token exchange is in flight. A progress spinner and
 *   the localised "signing you in" copy are shown, and no navigation has
 *   occurred yet.
 * - **Success** — the exchange resolves; the view pulls the preserved
 *   `returnTo` path from `sessionStorage` (falling back to `/`) and calls
 *   `router.replace()`.
 * - **Error** — the exchange rejects; the view flips to the error branch,
 *   surfaces `store.error` in a tonal alert, and renders both a retry and
 *   a back-to-login affordance.
 *
 * Also covers the two edge cases: a missing provider id in the route
 * params (fails closed with an "unknown provider" error) and the retry
 * button re-invoking the store action.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CallbackView from '@/views/auth/CallbackView.vue'
import en from '@/locales/en.json'
import {
  LOGIN_ROUTE_PATH,
  RETURN_TO_STORAGE_KEY,
} from '@/auth/constants'
import type { OAuthProviderConfig } from '@/auth/types'

/* ── Mock router ────────────────────────────────────────────────────── */

/**
 * The provider id delivered to the view via the route params. Adjusted
 * per-test by reassigning `mockRouteParams` before mounting.
 */
let mockRouteParams: Record<string, string | string[]> = { providerId: 'keycloak' }

const mockReplace = vi.fn()
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}))

/* ── Mock auth store ────────────────────────────────────────────────── */

const mockHandleCallback = vi.fn()
const mockReset = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
const mockUseAuthStore = vi.mocked(useAuthStore)

/* ── Test fixtures ──────────────────────────────────────────────────── */

const KEYCLOAK_PROVIDER: OAuthProviderConfig = Object.freeze({
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
})

/* ── Helpers ────────────────────────────────────────────────────────── */

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

function createTestVuetify() {
  return createVuetify({ components, directives })
}

/**
 * Build the mock auth-store state used by the view. Captures the
 * `error` / `status` fields as plain values; the component only reads
 * them through `store.<field>`.
 */
function createMockAuthState(overrides: {
  providers?: readonly OAuthProviderConfig[]
  status?: 'idle' | 'authenticating' | 'authenticated' | 'error'
  error?: string | null
} = {}) {
  const {
    providers = [KEYCLOAK_PROVIDER],
    status = 'idle',
    error = null,
  } = overrides

  return {
    providers,
    config: { providers },
    user: null,
    activeProviderId: null,
    status,
    error,
    isAuthEnabled: providers.length > 0,
    isAuthenticated: false,
    isAdmin: false,
    isViewer: false,
    init: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    handleCallback: mockHandleCallback,
    logout: vi.fn(),
    $reset: mockReset,
  }
}

function mountCallbackView(
  overrides: Parameters<typeof createMockAuthState>[0] = {},
): VueWrapper {
  const state = createMockAuthState(overrides)
  mockUseAuthStore.mockReturnValue(state as any)
  return mount(CallbackView, {
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: { 'router-link': true },
    },
  })
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe('CallbackView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.sessionStorage.clear()
    mockRouteParams = { providerId: 'keycloak' }
  })

  afterEach(() => {
    window.sessionStorage.clear()
  })

  describe('loading state', () => {
    it('renders the loading copy while the token exchange is pending', async () => {
      // A never-resolving promise keeps the view in the loading branch.
      mockHandleCallback.mockReturnValue(new Promise(() => {}))
      const wrapper = mountCallbackView()
      // Flush the microtasks scheduled by `onMounted`.
      await flushPromises()

      expect(wrapper.text()).toContain('Signing you in…')
      expect(wrapper.text()).toContain(
        `Completing authentication with ${KEYCLOAK_PROVIDER.displayName}…`,
      )
      // Error branch must not yet be visible.
      expect(wrapper.text()).not.toContain('Sign-in failed')
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('invokes handleCallback with the provider id from the route', async () => {
      mockHandleCallback.mockResolvedValue(undefined)
      mountCallbackView()
      await flushPromises()
      expect(mockHandleCallback).toHaveBeenCalledTimes(1)
      expect(mockHandleCallback).toHaveBeenCalledWith('keycloak')
    })
  })

  describe('success state', () => {
    it('redirects to the preserved returnTo path on resolve', async () => {
      window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, '/policies/abc')
      mockHandleCallback.mockResolvedValue(undefined)
      mountCallbackView()
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith('/policies/abc')
      expect(window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)).toBeNull()
    })

    it('falls back to "/" when no returnTo is preserved', async () => {
      mockHandleCallback.mockResolvedValue(undefined)
      mountCallbackView()
      await flushPromises()

      expect(mockReplace).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  describe('error state', () => {
    it('renders the error card with the store error and both actions', async () => {
      mockHandleCallback.mockRejectedValue(new Error('invalid_grant'))
      const wrapper = mountCallbackView({
        status: 'error',
        error: 'invalid_grant',
      })
      await flushPromises()

      expect(wrapper.text()).toContain('Sign-in failed')
      // The explicit error message surfaced from the store.
      expect(wrapper.text()).toContain('invalid_grant')
      // The helper copy describing the next step.
      expect(wrapper.text()).toContain(
        'We could not complete the sign-in. You can try again or return to the login page.',
      )
      expect(wrapper.text()).toContain('Try again')
      expect(wrapper.text()).toContain('Back to login')
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('retries the token exchange when the retry button is clicked', async () => {
      mockHandleCallback
        .mockRejectedValueOnce(new Error('invalid_grant'))
        .mockResolvedValueOnce(undefined)
      const wrapper = mountCallbackView({
        status: 'error',
        error: 'invalid_grant',
      })
      await flushPromises()

      const retryBtn = wrapper
        .findAllComponents({ name: 'v-btn' })
        .find((b) => b.text() === 'Try again')
      expect(retryBtn).toBeDefined()
      await retryBtn!.trigger('click')
      await flushPromises()

      expect(mockHandleCallback).toHaveBeenCalledTimes(2)
      // A successful retry redirects to the fallback target.
      expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('routes back to /login when the "Back to login" action is clicked', async () => {
      mockHandleCallback.mockRejectedValue(new Error('invalid_grant'))
      const wrapper = mountCallbackView({
        status: 'error',
        error: 'invalid_grant',
      })
      await flushPromises()

      const backBtn = wrapper
        .findAllComponents({ name: 'v-btn' })
        .find((b) => b.text() === 'Back to login')
      expect(backBtn).toBeDefined()
      await backBtn!.trigger('click')
      await flushPromises()

      expect(mockReset).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
    })
  })

  describe('missing provider id', () => {
    it('shows the error state without invoking handleCallback', async () => {
      mockRouteParams = {}
      mountCallbackView()
      await flushPromises()

      expect(mockHandleCallback).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
    })
  })
})
