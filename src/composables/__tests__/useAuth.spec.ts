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
 * Unit tests for the {@link useAuth} composable.
 *
 * Covers the three scenarios that matter to the UI layer:
 *
 * 1. Auth disabled (no providers configured) — every capability flag is
 *    `true` so the dashboard keeps its legacy open-mode behaviour.
 * 2. Auth enabled + viewer signed in — read-only flags are `true`, edit /
 *    delete flags are `false`.
 * 3. Auth enabled + admin signed in — every flag is `true`.
 *
 * The composable is a thin reactive wrapper over the auth Pinia store, so
 * the tests drive it by mutating the store state directly rather than
 * going through the whole login flow.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  ROLE_ADMIN,
  ROLE_VIEWER,
  RUNTIME_CONFIG_GLOBAL,
} from '@/auth/constants'

/* ── Mock the OIDC facade so the auth store is driveable in isolation ── */

vi.mock('@/auth/oidcClient', () => ({
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  signoutRedirect: vi.fn(),
  getUser: vi.fn(),
  removeUser: vi.fn(),
}))

/* ── Test fixtures ─────────────────────────────────────────────────── */

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
    (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL] = {
      providers,
    }
  }
}

/**
 * Re-import both the auth store and the composable under a fresh module
 * registry so every test gets a deterministic `config` ref derived from
 * the current runtime global.
 */
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

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setRuntimeProviders(null)
  })

  afterEach(() => {
    setRuntimeProviders(null)
  })

  describe('auth disabled (no providers configured)', () => {
    beforeEach(() => {
      setRuntimeProviders([])
    })

    it('reports all capability flags as true', async () => {
      const { useAuth } = await freshComposable()
      const auth = useAuth()
      expect(auth.isAdmin.value).toBe(true)
      expect(auth.isViewer.value).toBe(true)
      expect(auth.canEdit.value).toBe(true)
      expect(auth.canDelete.value).toBe(true)
      expect(auth.isAuthenticated.value).toBe(true)
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
