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
 * Unit tests for the {@link ApisixView} component.
 *
 * Covers:
 * - Renders the iframe when the upstream URL is configured and the user
 *   is authorised (admin or auth disabled).
 * - Renders the "not configured" informational alert when the upstream
 *   URL has not been set.
 * - Renders the "forbidden" defensive warning when auth is enabled and
 *   the user is not an admin.
 * - Back button and Escape keypress both navigate to the home route.
 * - The iframe `src` equals {@link APISIX_DASHBOARD_BASE_PATH}.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import ApisixView from '../ApisixView.vue'
import { APISIX_DASHBOARD_BASE_PATH } from '@/apisix/constants'
import enMessages from '@/locales/en.json'

/* ── Mocks ────────────────────────────────────────────────────────── */

/**
 * Mock the OIDC facade to prevent the auth store from attempting real
 * network calls when instantiated.
 */
vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  signoutRedirect: vi.fn(),
  getUser: vi.fn(),
  removeUser: vi.fn(),
}))

/** Controlled return value for {@link loadApisixConfig}. */
const mockLoadApisixConfig = vi.fn()

/** Controlled return value for {@link isApisixConfigured}. */
const mockIsApisixConfigured = vi.fn()

vi.mock('@/apisix/config', () => ({
  loadApisixConfig: (...args: unknown[]) => mockLoadApisixConfig(...args),
  isApisixConfigured: (...args: unknown[]) => mockIsApisixConfigured(...args),
}))

/**
 * Controlled mock for the auth store.
 *
 * The component reads `isAuthEnabled` and `isAdmin` from the store.
 * We mock `useAuthStore` to return a plain reactive-like object whose
 * properties are set per test case.
 */
const mockAuthStore = {
  isAuthEnabled: false,
  isAdmin: true,
  isAuthenticated: true,
  isViewer: true,
  user: null,
  activeProviderId: null,
  config: { providers: [] },
  status: 'idle',
  error: null,
  providers: [],
  init: vi.fn(),
  login: vi.fn(),
  handleCallback: vi.fn(),
  logout: vi.fn(),
  $reset: vi.fn(),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

/* ── Helpers ──────────────────────────────────────────────────────── */

/** A valid upstream URL used in test fixtures. */
const TEST_UPSTREAM_URL = 'http://apisix-dashboard:9000'

/** Placeholder component for the home route target. */
const HomeStub = { template: '<div>Home</div>' }

/**
 * Create a fresh in-memory router for test use.
 *
 * @returns a Vue Router instance with `home` and `apisix-dashboard` routes.
 */
function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeStub },
      { path: '/apisix', name: 'apisix-dashboard', component: ApisixView },
    ],
  })
}

/** Create a Vuetify instance for test mounting. */
function createTestVuetify() {
  return createVuetify({ components, directives })
}

/** Create a Vue I18n instance with the real English messages. */
function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: enMessages },
  })
}

/**
 * Mount the {@link ApisixView} component with all required plugins.
 *
 * @param testRouter - the router instance to install.
 * @returns the wrapper.
 */
function mountView(testRouter: Router): VueWrapper {
  return mount(ApisixView, {
    global: {
      plugins: [createPinia(), createTestVuetify(), createTestI18n(), testRouter],
    },
    attachTo: document.body,
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('ApisixView', () => {
  let testRouter: Router
  let routerPushSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    testRouter = createTestRouter()
    routerPushSpy = vi.spyOn(testRouter, 'push')

    // Default: configured, auth disabled (everyone is admin)
    mockLoadApisixConfig.mockReturnValue({ upstreamUrl: TEST_UPSTREAM_URL })
    mockIsApisixConfigured.mockReturnValue(true)
    mockAuthStore.isAuthEnabled = false
    mockAuthStore.isAdmin = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering states', () => {
    it.each([
      {
        label: 'configured + auth disabled',
        configured: true,
        authEnabled: false,
        isAdmin: true,
      },
      {
        label: 'configured + admin user',
        configured: true,
        authEnabled: true,
        isAdmin: true,
      },
    ])(
      'renders the iframe when $label',
      async ({ configured, authEnabled, isAdmin }) => {
        mockIsApisixConfigured.mockReturnValue(configured)
        mockAuthStore.isAuthEnabled = authEnabled
        mockAuthStore.isAdmin = isAdmin
        if (configured) {
          mockLoadApisixConfig.mockReturnValue({ upstreamUrl: TEST_UPSTREAM_URL })
        } else {
          mockLoadApisixConfig.mockReturnValue({ upstreamUrl: null })
        }

        const wrapper = mountView(testRouter)
        await testRouter.isReady()

        const iframe = wrapper.find('[data-testid="apisix-iframe"]')
        expect(iframe.exists()).toBe(true)
        expect(wrapper.find('[data-testid="not-configured-alert"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="forbidden-alert"]').exists()).toBe(false)

        wrapper.unmount()
      },
    )

    it('renders the "not configured" alert when upstream URL is unset', async () => {
      mockLoadApisixConfig.mockReturnValue({ upstreamUrl: null })
      mockIsApisixConfigured.mockReturnValue(false)

      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      expect(wrapper.find('[data-testid="not-configured-alert"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="apisix-iframe"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="forbidden-alert"]').exists()).toBe(false)

      wrapper.unmount()
    })

    it('renders the "forbidden" alert when auth is enabled and user is not admin', async () => {
      mockLoadApisixConfig.mockReturnValue({ upstreamUrl: TEST_UPSTREAM_URL })
      mockIsApisixConfigured.mockReturnValue(true)
      mockAuthStore.isAuthEnabled = true
      mockAuthStore.isAdmin = false

      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      expect(wrapper.find('[data-testid="forbidden-alert"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="apisix-iframe"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="not-configured-alert"]').exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe('iframe attributes', () => {
    it('sets src to APISIX_DASHBOARD_BASE_PATH', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const iframe = wrapper.find('[data-testid="apisix-iframe"]')
      expect(iframe.attributes('src')).toBe(APISIX_DASHBOARD_BASE_PATH)

      wrapper.unmount()
    })

    it('includes the required sandbox permissions', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const iframe = wrapper.find('[data-testid="apisix-iframe"]')
      const sandbox = iframe.attributes('sandbox') ?? ''
      expect(sandbox).toContain('allow-scripts')
      expect(sandbox).toContain('allow-same-origin')
      expect(sandbox).toContain('allow-forms')
      expect(sandbox).toContain('allow-popups')
      expect(sandbox).toContain('allow-popups-to-escape-sandbox')

      wrapper.unmount()
    })

    it('sets referrerpolicy to no-referrer-when-downgrade', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const iframe = wrapper.find('[data-testid="apisix-iframe"]')
      expect(iframe.attributes('referrerpolicy')).toBe('no-referrer-when-downgrade')

      wrapper.unmount()
    })

    it('sets loading to eager', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const iframe = wrapper.find('[data-testid="apisix-iframe"]')
      expect(iframe.attributes('loading')).toBe('eager')

      wrapper.unmount()
    })
  })

  describe('navigation', () => {
    it('navigates to home when the back button is clicked', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const backBtn = wrapper.find('[data-testid="back-btn"]')
      expect(backBtn.exists()).toBe(true)
      await backBtn.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({ name: 'home' })

      wrapper.unmount()
    })

    it('navigates to home when the back button is clicked in "not configured" state', async () => {
      mockLoadApisixConfig.mockReturnValue({ upstreamUrl: null })
      mockIsApisixConfigured.mockReturnValue(false)

      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const backBtn = wrapper.find('[data-testid="back-btn"]')
      expect(backBtn.exists()).toBe(true)
      await backBtn.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({ name: 'home' })

      wrapper.unmount()
    })

    it('navigates to home when Escape is pressed on the wrapper', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const wrapperEl = wrapper.find('.apisix-view')
      await wrapperEl.trigger('keydown', { key: 'Escape' })

      expect(routerPushSpy).toHaveBeenCalledWith({ name: 'home' })

      wrapper.unmount()
    })

    it('provides an "open in new tab" link pointing to the dashboard base path', async () => {
      const wrapper = mountView(testRouter)
      await testRouter.isReady()

      const newTabBtn = wrapper.find('[data-testid="open-new-tab-btn"]')
      expect(newTabBtn.exists()).toBe(true)
      expect(newTabBtn.attributes('href')).toBe(APISIX_DASHBOARD_BASE_PATH)
      expect(newTabBtn.attributes('target')).toBe('_blank')

      wrapper.unmount()
    })
  })
})
