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
 * Component tests for TilDetailView.
 *
 * Verifies loading, error, and populated states for the issuer detail view,
 * including credentials display and delete functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TilDetailView from '@/views/til/TilDetailView.vue'
import en from '@/locales/en.json'

/* ── Mock router ────────────────────────────────────────────────── */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { did: 'did:example:1' } }),
}))

/* ── Mock TIL store ─────────────────────────────────────────────── */
const mockFetchIssuerDetail = vi.fn()
const mockDeleteIssuer = vi.fn()

vi.mock('@/stores/til', () => ({
  useTilStore: vi.fn(),
}))

import { useTilStore } from '@/stores/til'
const mockUseTilStore = vi.mocked(useTilStore)

/* ── Test data ───────────────────────────────────────────────────── */

/** A fully-populated mock issuer for testing the content state. */
const MOCK_ISSUER = {
  did: 'did:example:1',
  credentials: [
    {
      credentialsType: 'VerifiableCredential',
      validFor: { from: '2024-01-01T00:00:00Z', to: '2025-01-01T00:00:00Z' },
      claims: [
        {
          name: 'role',
          path: '$.credentialSubject.role',
          allowedValues: [{ inner: 'READER' }, { inner: 'WRITER' }],
        },
      ],
    },
  ],
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function createTestI18n() {
  return createI18n({ legacy: false, locale: 'en', messages: { en } })
}

function createTestVuetify() {
  return createVuetify({ components, directives })
}

function createMockStoreState(overrides: Record<string, unknown> = {}) {
  return {
    issuers: [],
    totalIssuers: 0,
    pageSize: 10,
    currentPage: 0,
    listLoading: false,
    listError: null,
    selectedIssuer: null,
    detailLoading: false,
    detailError: null,
    saving: false,
    saveError: null,
    isEmpty: true,
    totalPages: 1,
    fetchIssuers: vi.fn(),
    fetchIssuerDetail: mockFetchIssuerDetail,
    createIssuer: vi.fn(),
    updateIssuer: vi.fn(),
    deleteIssuer: mockDeleteIssuer,
    $reset: vi.fn(),
    ...overrides,
  }
}

function mountComponent(storeOverrides: Record<string, unknown> = {}): VueWrapper {
  const storeState = createMockStoreState(storeOverrides)
  mockUseTilStore.mockReturnValue(storeState as any)

  return mount(TilDetailView, {
    props: { did: 'did:example:1' },
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        'router-link': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('TilDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('rendering states', () => {
    it('should render back button', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Back')
    })

    it('should render page title', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Issuer Details')
    })

    it('should show loading skeleton when detailLoading is true', () => {
      const wrapper = mountComponent({ detailLoading: true })
      const skeletons = wrapper.findAllComponents({ name: 'v-skeleton-loader' })
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    it('should show error alert when detailError is set', () => {
      const wrapper = mountComponent({ detailError: 'Not found' })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('Not found')
    })

    it('should show refresh button in error state', () => {
      const wrapper = mountComponent({ detailError: 'Error' })
      expect(wrapper.text()).toContain('Refresh')
    })

    it('should display issuer DID when loaded', () => {
      const wrapper = mountComponent({ selectedIssuer: MOCK_ISSUER })
      expect(wrapper.text()).toContain('did:example:1')
    })

    it('should display credential type in expansion panel', () => {
      const wrapper = mountComponent({ selectedIssuer: MOCK_ISSUER })
      expect(wrapper.text()).toContain('VerifiableCredential')
    })

    it('should display credential count chip', () => {
      const wrapper = mountComponent({ selectedIssuer: MOCK_ISSUER })
      // 1 credential
      expect(wrapper.text()).toContain('1')
    })

    it('should show edit and delete buttons when issuer is loaded', () => {
      const wrapper = mountComponent({ selectedIssuer: MOCK_ISSUER })
      expect(wrapper.text()).toContain('Edit')
      expect(wrapper.text()).toContain('Delete')
    })

    it('should not show edit and delete buttons when no issuer is loaded', () => {
      const wrapper = mountComponent({ selectedIssuer: null })
      // The buttons are conditional on store.selectedIssuer
      const deleteButtons = wrapper.findAll('.v-btn').filter(
        (btn) => btn.text() === 'Delete',
      )
      expect(deleteButtons.length).toBe(0)
    })
  })

  describe('lifecycle', () => {
    it('should call fetchIssuerDetail on mount with the DID prop', () => {
      mountComponent()
      expect(mockFetchIssuerDetail).toHaveBeenCalledWith('did:example:1')
    })
  })

  describe('no credentials state', () => {
    it('should show no credentials message when issuer has empty credentials', () => {
      const wrapper = mountComponent({
        selectedIssuer: { did: 'did:example:1', credentials: [] },
      })
      expect(wrapper.text()).toContain('No credentials configured')
    })
  })
})
