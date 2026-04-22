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
 * Component tests for {@link App.vue}.
 *
 * Focus: the app-bar user menu introduced in step 6 of the OAuth2
 * implementation plan. The menu must:
 *
 * - Stay hidden when auth is disabled (no providers configured) so the
 *   legacy unauthenticated-by-default deployment is unchanged.
 * - Stay hidden when auth is enabled but no user is signed in (the router
 *   guard redirects to /login, so the app bar should not advertise an
 *   active session).
 * - Render the user's display name, provider display name, and localised
 *   role label when a session is active.
 * - Trigger the store's `logout()` action when the sign-out entry is
 *   clicked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from '@/App.vue'
import en from '@/locales/en.json'
import {
  ROLE_ADMIN,
  ROLE_VIEWER,
} from '@/auth/constants'
import type { AuthenticatedUser, OAuthProviderConfig } from '@/auth/types'

/* ── Mocks ────────────────────────────────────────────────────────── */

/* Stub out router-view / router-link so App can mount standalone. */
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home', fullPath: '/' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterView: { template: '<div class="router-view-stub" />' },
  RouterLink: {
    props: ['to'],
    template: '<a class="router-link-stub"><slot /></a>',
  },
}))

/* Mock the auth store so we can drive every auth-related render state
 * deterministically. */
const mockLogout = vi.fn()
const mockInit = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
const mockUseAuthStore = vi.mocked(useAuthStore)

/* ── Test helpers ─────────────────────────────────────────────────── */

/** A sample provider used for all populated-session tests. */
const KEYCLOAK_PROVIDER: OAuthProviderConfig = Object.freeze({
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
})

/** Admin user fixture. */
const ADMIN_USER: AuthenticatedUser = Object.freeze({
  subject: 'sub-1',
  name: 'Ada Admin',
  email: 'ada@example.com',
  role: ROLE_ADMIN,
  providerId: KEYCLOAK_PROVIDER.id,
})

/** Viewer user fixture. */
const VIEWER_USER: AuthenticatedUser = Object.freeze({
  subject: 'sub-2',
  name: 'Vera Viewer',
  email: 'vera@example.com',
  role: ROLE_VIEWER,
  providerId: KEYCLOAK_PROVIDER.id,
})

/** Create a fresh i18n instance wired up with the real `en` bundle. */
function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  })
}

/** Create a fresh Vuetify instance. */
function createTestVuetify() {
  return createVuetify({ components, directives })
}

/**
 * Build a mock auth-store state object. App.vue reads every auth-store
 * field via `computed(() => authStore.x)` so we can expose them as plain
 * values and Vue's reactivity still picks up changes through the
 * component's lifecycle.
 */
function createMockAuthState(overrides: {
  user?: AuthenticatedUser | null
  activeProviderId?: string | null
  providers?: readonly OAuthProviderConfig[]
  isAuthEnabled?: boolean
  isAuthenticated?: boolean
} = {}) {
  const {
    user = null,
    activeProviderId = null,
    providers = [],
    isAuthEnabled = false,
    isAuthenticated = false,
  } = overrides

  return {
    user,
    activeProviderId,
    providers,
    isAuthEnabled,
    isAuthenticated,
    config: { providers },
    error: null,
    status: 'idle',
    isAdmin: user?.role === ROLE_ADMIN,
    isViewer: user?.role === ROLE_VIEWER || user?.role === ROLE_ADMIN,
    // Actions
    init: mockInit,
    login: vi.fn(),
    handleCallback: vi.fn(),
    logout: mockLogout,
    $reset: vi.fn(),
  }
}

/** Mount App.vue with all global plugins installed. */
function mountApp(
  stateOverrides: Parameters<typeof createMockAuthState>[0] = {},
): VueWrapper {
  const state = createMockAuthState(stateOverrides)
  mockUseAuthStore.mockReturnValue(state as any)
  return mount(App, {
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        // Keep router-view inert; see the router mock above for router-link.
        'router-view': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('App.vue user menu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('hides the user menu when auth is disabled', async () => {
      const wrapper = mountApp({
        isAuthEnabled: false,
        isAuthenticated: false,
        user: null,
      })
      await flushPromises()
      expect(wrapper.find('.user-menu-activator').exists()).toBe(false)
    })

    it('hides the user menu when auth is enabled but no user is signed in', async () => {
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: false,
        user: null,
        providers: [KEYCLOAK_PROVIDER],
      })
      await flushPromises()
      expect(wrapper.find('.user-menu-activator').exists()).toBe(false)
    })

    it.each([
      ['admin', ADMIN_USER],
      ['viewer', VIEWER_USER],
    ])(
      'shows the user menu for a signed-in %s',
      async (_role, userFixture) => {
        const wrapper = mountApp({
          isAuthEnabled: true,
          isAuthenticated: true,
          user: userFixture,
          activeProviderId: KEYCLOAK_PROVIDER.id,
          providers: [KEYCLOAK_PROVIDER],
        })
        await flushPromises()
        expect(wrapper.find('.user-menu-activator').exists()).toBe(true)
      },
    )
  })

  describe('menu content', () => {
    it('renders the user name, provider display name, and admin role label', async () => {
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: true,
        user: ADMIN_USER,
        activeProviderId: KEYCLOAK_PROVIDER.id,
        providers: [KEYCLOAK_PROVIDER],
      })
      await flushPromises()
      await wrapper.find('.user-menu-activator').trigger('click')
      await flushPromises()

      const menuHtml = document.body.innerHTML
      expect(menuHtml).toContain('Ada Admin')
      expect(menuHtml).toContain('Keycloak')
      expect(menuHtml).toContain('Administrator')
      expect(menuHtml).toContain('Sign out')
    })

    it('renders the localised viewer role label', async () => {
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: true,
        user: VIEWER_USER,
        activeProviderId: KEYCLOAK_PROVIDER.id,
        providers: [KEYCLOAK_PROVIDER],
      })
      await flushPromises()
      await wrapper.find('.user-menu-activator').trigger('click')
      await flushPromises()

      const menuHtml = document.body.innerHTML
      expect(menuHtml).toContain('Vera Viewer')
      expect(menuHtml).toContain('Viewer')
    })

    it('falls back to the raw provider id when no matching config is registered', async () => {
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: true,
        user: ADMIN_USER,
        activeProviderId: 'orphan-id',
        providers: [], // Mismatch on purpose.
      })
      await flushPromises()
      await wrapper.find('.user-menu-activator').trigger('click')
      await flushPromises()

      const menuHtml = document.body.innerHTML
      expect(menuHtml).toContain('orphan-id')
    })
  })

  describe('sign-out action', () => {
    it('calls the auth store logout action when sign-out is clicked', async () => {
      mockLogout.mockResolvedValueOnce(undefined)
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: true,
        user: ADMIN_USER,
        activeProviderId: KEYCLOAK_PROVIDER.id,
        providers: [KEYCLOAK_PROVIDER],
      })
      await flushPromises()
      await wrapper.find('.user-menu-activator').trigger('click')
      await flushPromises()

      const signOutItem = document.body.querySelector(
        '.user-menu-signout',
      ) as HTMLElement | null
      expect(signOutItem).not.toBeNull()
      signOutItem!.click()
      await flushPromises()

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    it('swallows a failing logout so the UI can recover', async () => {
      mockLogout.mockRejectedValueOnce(new Error('boom'))
      const wrapper = mountApp({
        isAuthEnabled: true,
        isAuthenticated: true,
        user: ADMIN_USER,
        activeProviderId: KEYCLOAK_PROVIDER.id,
        providers: [KEYCLOAK_PROVIDER],
      })
      await flushPromises()
      await wrapper.find('.user-menu-activator').trigger('click')
      await flushPromises()

      const signOutItem = document.body.querySelector(
        '.user-menu-signout',
      ) as HTMLElement | null
      expect(signOutItem).not.toBeNull()

      // The click handler awaits `logout()` internally and must not throw
      // out of the component tree even when the action rejects.
      await expect(async () => {
        signOutItem!.click()
        await flushPromises()
      }).not.toThrow()

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  describe('lifecycle', () => {
    it('calls authStore.init on mount so cached sessions are restored', async () => {
      mountApp()
      await flushPromises()
      expect(mockInit).toHaveBeenCalledTimes(1)
    })
  })
})
