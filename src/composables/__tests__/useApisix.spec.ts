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
 * Unit tests for the `useApisix` composable.
 *
 * Verifies the visibility truth table:
 *
 * | configured | authEnabled | role    | isVisible |
 * |------------|-------------|---------|-----------|
 * | false      | false       | (any)   | false     |
 * | false      | true        | admin   | false     |
 * | false      | true        | viewer  | false     |
 * | true       | false       | (any)   | true      |
 * | true       | true        | admin   | true      |
 * | true       | true        | viewer  | false     |
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  RUNTIME_APISIX_CONFIG_GLOBAL,
  RUNTIME_APISIX_CONFIG_KEY,
} from '@/apisix/constants'
import { RUNTIME_CONFIG_GLOBAL } from '@/auth/constants'

/** Upstream URL used by tests that need a "configured" state. */
const STUB_UPSTREAM_URL = 'http://apisix-dashboard:9000'

/** A syntactically complete OIDC provider. */
const KEYCLOAK_PROVIDER_RAW = {
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
}

vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  signoutRedirect: vi.fn(),
  getUser: vi.fn(),
  removeUser: vi.fn(),
}))

/**
 * Set (or clear) the runtime Apisix config global on `window`.
 *
 * @param url - the upstream URL to inject, or `null` to remove.
 */
function setRuntimeApisixConfig(url: string | null): void {
  if (url === null) {
    delete (window as unknown as Record<string, unknown>)[RUNTIME_APISIX_CONFIG_GLOBAL]
  } else {
    (window as unknown as Record<string, unknown>)[RUNTIME_APISIX_CONFIG_GLOBAL] = {
      [RUNTIME_APISIX_CONFIG_KEY]: url,
    }
  }
}

/**
 * Set (or clear) the runtime auth-config global on `window`.
 *
 * @param providers - the provider list to inject, or `null` to remove.
 */
function setRuntimeAuthProviders(providers: unknown[] | null): void {
  if (providers === null) {
    delete (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL]
  } else {
    (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL] = {
      providers,
    }
  }
}

/**
 * Import a fresh copy of the composable + auth store under a clean module
 * registry so each test starts from scratch.
 */
async function freshComposable() {
  vi.resetModules()
  setActivePinia(createPinia())
  const composableMod = await import('@/composables/useApisix')
  const authStoreMod = await import('@/stores/auth')
  return {
    useApisix: composableMod.useApisix,
    useAuthStore: authStoreMod.useAuthStore,
  }
}

describe('useApisix', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
    setRuntimeApisixConfig(null)
    setRuntimeAuthProviders(null)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
    setRuntimeApisixConfig(null)
    setRuntimeAuthProviders(null)
  })

  describe('isConfigured', () => {
    it('returns false when no upstream URL is set', async () => {
      const { useApisix } = await freshComposable()
      const { isConfigured } = useApisix()
      expect(isConfigured).toBe(false)
    })

    it('returns true when the runtime global provides an upstream URL', async () => {
      setRuntimeApisixConfig(STUB_UPSTREAM_URL)
      const { useApisix } = await freshComposable()
      const { isConfigured } = useApisix()
      expect(isConfigured).toBe(true)
    })
  })

  describe('config', () => {
    it('contains null upstreamUrl when unconfigured', async () => {
      const { useApisix } = await freshComposable()
      const { config } = useApisix()
      expect(config.upstreamUrl).toBeNull()
    })

    it('contains the upstream URL when configured', async () => {
      setRuntimeApisixConfig(STUB_UPSTREAM_URL)
      const { useApisix } = await freshComposable()
      const { config } = useApisix()
      expect(config.upstreamUrl).toBe(STUB_UPSTREAM_URL)
    })
  })

  describe('isVisible — parameterized truth table', () => {
    /**
     * Each row describes a combination of:
     * - `configured`: whether an Apisix upstream URL is set.
     * - `authEnabled`: whether an OIDC provider is configured.
     * - `role`: the user's role in the auth store ('admin' | 'viewer' | null).
     * - `expected`: the expected value of `isVisible`.
     */
    const cases: Array<{
      configured: boolean
      authEnabled: boolean
      role: 'admin' | 'viewer' | null
      expected: boolean
    }> = [
      // Not configured — always hidden
      { configured: false, authEnabled: false, role: null, expected: false },
      { configured: false, authEnabled: true, role: 'admin', expected: false },
      { configured: false, authEnabled: true, role: 'viewer', expected: false },
      // Configured + auth disabled — visible (open mode)
      { configured: true, authEnabled: false, role: null, expected: true },
      // Configured + auth enabled + admin — visible
      { configured: true, authEnabled: true, role: 'admin', expected: true },
      // Configured + auth enabled + viewer — hidden
      { configured: true, authEnabled: true, role: 'viewer', expected: false },
    ]

    it.each(cases)(
      'configured=$configured, authEnabled=$authEnabled, role=$role → isVisible=$expected',
      async ({ configured, authEnabled, role, expected }) => {
        // Configure apisix upstream
        if (configured) {
          setRuntimeApisixConfig(STUB_UPSTREAM_URL)
        }

        // Configure auth providers
        if (authEnabled) {
          setRuntimeAuthProviders([KEYCLOAK_PROVIDER_RAW])
        }

        const { useApisix, useAuthStore } = await freshComposable()
        const authStore = useAuthStore()

        // Simulate authentication state based on role
        if (authEnabled && role !== null) {
          // Directly set store state to simulate an authenticated user
          authStore.$patch({
            user: {
              subject: 'sub-123',
              name: 'Test User',
              role,
              providerId: 'keycloak',
            },
            activeProviderId: 'keycloak',
          })
        }

        const { isVisible } = useApisix()
        expect(isVisible.value).toBe(expected)
      },
    )
  })
})
