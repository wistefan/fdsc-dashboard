/**
 * Component tests for CcsDetailView.
 *
 * Verifies loading, error, and populated states for the CCS service
 * detail view, including OIDC scopes display and delete functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CcsDetailView from '@/views/ccs/CcsDetailView.vue'
import en from '@/locales/en.json'

/* ── Mock router ────────────────────────────────────────────────── */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'happy-pets-service' } }),
}))

/* ── Mock CCS store ─────────────────────────────────────────────── */
const mockFetchServiceDetail = vi.fn()
const mockDeleteService = vi.fn()

vi.mock('@/stores/ccs', () => ({
  useCcsStore: vi.fn(),
}))

import { useCcsStore } from '@/stores/ccs'
const mockUseCcsStore = vi.mocked(useCcsStore)

/* ── Test data ───────────────────────────────────────────────────── */

/** A fully-populated mock service for testing the content state. */
const MOCK_SERVICE = {
  id: 'happy-pets-service',
  defaultOidcScope: 'happyPetsScope',
  authorizationType: 'FRONTEND_V2',
  oidcScopes: {
    happyPetsScope: {
      credentials: [
        {
          type: 'HappyPetsCredential',
          trustedIssuersLists: ['https://til.example.com'],
          trustedParticipantsLists: [],
        },
      ],
      flatClaims: true,
    },
    adminScope: {
      credentials: [
        {
          type: 'AdminCredential',
          trustedIssuersLists: ['https://til-admin.example.com'],
        },
      ],
    },
  },
}

/** A mock service with no OIDC scopes. */
const MOCK_SERVICE_NO_SCOPES = {
  id: 'empty-service',
  defaultOidcScope: 'defaultScope',
  oidcScopes: {},
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
    services: [],
    totalServices: 0,
    pageSize: 10,
    currentPage: 0,
    listLoading: false,
    listError: null,
    selectedService: null,
    detailLoading: false,
    detailError: null,
    saving: false,
    saveError: null,
    isEmpty: true,
    totalPages: 1,
    fetchServices: vi.fn(),
    fetchServiceDetail: mockFetchServiceDetail,
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: mockDeleteService,
    $reset: vi.fn(),
    ...overrides,
  }
}

function mountComponent(storeOverrides: Record<string, unknown> = {}): VueWrapper {
  const storeState = createMockStoreState(storeOverrides)
  mockUseCcsStore.mockReturnValue(storeState as any)

  return mount(CcsDetailView, {
    props: { id: 'happy-pets-service' },
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        'router-link': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('CcsDetailView', () => {
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
      expect(wrapper.text()).toContain('Service Details')
    })

    it('should show loading skeleton when detailLoading is true', () => {
      const wrapper = mountComponent({ detailLoading: true })
      const skeletons = wrapper.findAllComponents({ name: 'v-skeleton-loader' })
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    it('should show error alert when detailError is set', () => {
      const wrapper = mountComponent({ detailError: 'Service not found' })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('Service not found')
    })

    it('should show refresh button in error state', () => {
      const wrapper = mountComponent({ detailError: 'Error' })
      expect(wrapper.text()).toContain('Refresh')
    })

    it('should display service ID when loaded', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      expect(wrapper.text()).toContain('happy-pets-service')
    })

    it('should display default OIDC scope when loaded', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      expect(wrapper.text()).toContain('happyPetsScope')
    })

    it('should display authorization type when present', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      expect(wrapper.text()).toContain('FRONTEND_V2')
    })

    it('should display scope names in expansion panels', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      expect(wrapper.text()).toContain('happyPetsScope')
      expect(wrapper.text()).toContain('adminScope')
    })

    it('should display scope count chip', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      // 2 scopes
      expect(wrapper.text()).toContain('2')
    })

    it('should show edit and delete buttons when service is loaded', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE })
      expect(wrapper.text()).toContain('Edit')
      expect(wrapper.text()).toContain('Delete')
    })

    it('should not show edit and delete buttons when no service is loaded', () => {
      const wrapper = mountComponent({ selectedService: null })
      const deleteButtons = wrapper.findAll('.v-btn').filter(
        (btn) => btn.text() === 'Delete',
      )
      expect(deleteButtons.length).toBe(0)
    })

    it('should show no scopes message when oidcScopes is empty', () => {
      const wrapper = mountComponent({ selectedService: MOCK_SERVICE_NO_SCOPES })
      expect(wrapper.text()).toContain('No OIDC scopes configured')
    })
  })

  describe('lifecycle', () => {
    it('should call fetchServiceDetail on mount with the id prop', () => {
      mountComponent()
      expect(mockFetchServiceDetail).toHaveBeenCalledWith('happy-pets-service')
    })
  })
})
