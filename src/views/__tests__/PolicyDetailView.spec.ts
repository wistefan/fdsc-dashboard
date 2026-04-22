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
 * Component tests for PolicyDetailView.
 *
 * Verifies loading, error, and populated states for the ODRL policy
 * detail view, including ODRL parsing, permissions display, and rego code.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PolicyDetailView from '@/views/policies/PolicyDetailView.vue'
import en from '@/locales/en.json'

/* ── Mock router ────────────────────────────────────────────────── */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'policy-1' } }),
}))

/* ── Mock policies store ────────────────────────────────────────── */
const mockFetchPolicyDetail = vi.fn()
const mockFetchServicePolicyDetail = vi.fn()
const mockDeletePolicy = vi.fn()
const mockDeleteServicePolicy = vi.fn()

vi.mock('@/stores/policies', () => ({
  usePoliciesStore: vi.fn(),
}))

import { usePoliciesStore } from '@/stores/policies'
const mockUsePoliciesStore = vi.mocked(usePoliciesStore)

/* ── Test data ───────────────────────────────────────────────────── */

/** A mock ODRL policy JSON string with permissions and constraints. */
const MOCK_ODRL_JSON = JSON.stringify({
  '@context': 'http://www.w3.org/ns/odrl.jsonld',
  '@type': 'Set',
  'uid': 'urn:policy:example',
  'permission': [
    {
      target: 'urn:asset:delivery-data',
      action: 'use',
      constraint: [
        {
          leftOperand: 'spatial',
          operator: 'eq',
          rightOperand: 'EU',
        },
      ],
    },
  ],
})

/** A fully-populated mock policy for testing the content state. */
const MOCK_POLICY = {
  id: 'policy-1',
  'odrl:uid': 'urn:policy:example',
  odrl: MOCK_ODRL_JSON,
  rego: 'package policy\n\ndefault allow = false',
}

/** A mock policy without rego code. */
const MOCK_POLICY_NO_REGO = {
  id: 'policy-2',
  'odrl:uid': 'urn:policy:2',
  odrl: JSON.stringify({ '@type': 'Offer', permission: [] }),
}

/** A mock policy with invalid ODRL JSON. */
const MOCK_POLICY_INVALID_ODRL = {
  id: 'policy-3',
  'odrl:uid': 'urn:policy:3',
  odrl: 'not-json',
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
    policies: [],
    totalPolicies: 0,
    pageSize: 10,
    currentPage: 0,
    listLoading: false,
    listError: null,
    selectedPolicy: null,
    detailLoading: false,
    detailError: null,
    saving: false,
    saveError: null,
    services: [],
    servicesLoading: false,
    serviceError: null,
    savingService: false,
    isEmpty: true,
    totalPages: 1,
    fetchPolicies: vi.fn(),
    fetchPolicyDetail: mockFetchPolicyDetail,
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: mockDeletePolicy,
    fetchServices: vi.fn(),
    createService: vi.fn(),
    deleteService: vi.fn(),
    fetchServicePolicies: vi.fn(),
    fetchServicePolicyDetail: mockFetchServicePolicyDetail,
    createServicePolicy: vi.fn(),
    updateServicePolicy: vi.fn(),
    deleteServicePolicy: mockDeleteServicePolicy,
    $reset: vi.fn(),
    ...overrides,
  }
}

function mountComponent(
  storeOverrides: Record<string, unknown> = {},
  propsOverrides: Record<string, unknown> = {},
): VueWrapper {
  const storeState = createMockStoreState(storeOverrides)
  mockUsePoliciesStore.mockReturnValue(storeState as any)

  return mount(PolicyDetailView, {
    props: { id: 'policy-1', ...propsOverrides },
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        'router-link': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('PolicyDetailView', () => {
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
      expect(wrapper.text()).toContain('Policy Details')
    })

    it('should show loading skeleton when detailLoading is true', () => {
      const wrapper = mountComponent({ detailLoading: true })
      const skeletons = wrapper.findAllComponents({ name: 'v-skeleton-loader' })
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    it('should show error alert when detailError is set', () => {
      const wrapper = mountComponent({ detailError: 'Policy not found' })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('Policy not found')
    })

    it('should show refresh button in error state', () => {
      const wrapper = mountComponent({ detailError: 'Error' })
      expect(wrapper.text()).toContain('Refresh')
    })

    it('should display policy ID when loaded', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('policy-1')
    })

    it('should display ODRL UID when loaded', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('urn:policy:example')
    })

    it('should display ODRL policy type chip', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('Set')
    })

    it('should display permission target', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('urn:asset:delivery-data')
    })

    it('should display permission action', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('use')
    })

    it('should display constraint details', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('spatial')
      expect(wrapper.text()).toContain('eq')
      expect(wrapper.text()).toContain('EU')
    })

    it('should display formatted ODRL JSON', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('"@type"')
    })

    it('should display rego code when present', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('Rego Code')
      expect(wrapper.text()).toContain('default allow = false')
    })

    it('should not display rego card when rego is absent', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY_NO_REGO })
      expect(wrapper.text()).not.toContain('Rego Code')
    })

    it('should not render ODRL section when ODRL is invalid JSON', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY_INVALID_ODRL })
      // parsedOdrl returns null for invalid JSON, so ODRL section is hidden
      expect(wrapper.text()).not.toContain('Permissions')
    })

    it('should show edit and delete buttons when policy is loaded', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      expect(wrapper.text()).toContain('Edit')
      expect(wrapper.text()).toContain('Delete')
    })

    it('should not show edit and delete buttons when no policy is loaded', () => {
      const wrapper = mountComponent({ selectedPolicy: null })
      const deleteButtons = wrapper.findAll('.v-btn').filter(
        (btn) => btn.text() === 'Delete',
      )
      expect(deleteButtons.length).toBe(0)
    })
  })

  describe('lifecycle', () => {
    it('should call fetchPolicyDetail on mount for global policy', () => {
      mountComponent()
      expect(mockFetchPolicyDetail).toHaveBeenCalledWith('policy-1')
      expect(mockFetchServicePolicyDetail).not.toHaveBeenCalled()
    })

    it('should call fetchServicePolicyDetail on mount for service-scoped policy', () => {
      mountComponent({}, { serviceId: 'my-service' })
      expect(mockFetchServicePolicyDetail).toHaveBeenCalledWith('my-service', 'policy-1')
      expect(mockFetchPolicyDetail).not.toHaveBeenCalled()
    })
  })

  describe('service badge', () => {
    it('should show service badge when serviceId is provided', () => {
      const wrapper = mountComponent(
        { selectedPolicy: MOCK_POLICY },
        { serviceId: 'my-service' },
      )
      expect(wrapper.text()).toContain('Service')
      expect(wrapper.text()).toContain('my-service')
    })

    it('should not show service badge when serviceId is absent', () => {
      const wrapper = mountComponent({ selectedPolicy: MOCK_POLICY })
      // The badge should not be rendered without serviceId
      const chips = wrapper.findAllComponents({ name: 'v-chip' })
      const serviceBadge = chips.filter((c) => c.text().includes('Service:'))
      expect(serviceBadge.length).toBe(0)
    })
  })
})
