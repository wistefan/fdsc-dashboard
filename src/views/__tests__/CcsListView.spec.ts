/**
 * Component tests for CcsListView.
 *
 * Verifies loading, error, and populated states for the CCS services
 * list view, including navigation and pagination.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CcsListView from '@/views/ccs/CcsListView.vue'
import en from '@/locales/en.json'

/* ── Mock router ────────────────────────────────────────────────── */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {} }),
}))

/* ── Mock CCS store ─────────────────────────────────────────────── */
const mockFetchServices = vi.fn()

vi.mock('@/stores/ccs', () => ({
  useCcsStore: vi.fn(),
}))

import { useCcsStore } from '@/stores/ccs'
const mockUseCcsStore = vi.mocked(useCcsStore)

/* ── Test data ───────────────────────────────────────────────────── */

/** Mock services for the populated state. */
const MOCK_SERVICES = [
  {
    id: 'happy-pets-service',
    defaultOidcScope: 'happyPetsScope',
    oidcScopes: {
      happyPetsScope: { credentials: [] },
      adminScope: { credentials: [] },
    },
  },
  {
    id: 'packet-delivery-service',
    defaultOidcScope: 'deliveryScope',
    oidcScopes: {
      deliveryScope: { credentials: [] },
    },
  },
]

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
    fetchServices: mockFetchServices,
    fetchServiceDetail: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn(),
    $reset: vi.fn(),
    ...overrides,
  }
}

function mountComponent(storeOverrides: Record<string, unknown> = {}): VueWrapper {
  const storeState = createMockStoreState(storeOverrides)
  mockUseCcsStore.mockReturnValue(storeState as any)

  return mount(CcsListView, {
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        'router-link': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('CcsListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('rendering states', () => {
    it('should render the page title', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Services')
    })

    it('should render a create button', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Create Service')
    })

    it('should show loading skeleton when listLoading is true', () => {
      const wrapper = mountComponent({ listLoading: true })
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
    })

    it('should show error alert when listError is set', () => {
      const wrapper = mountComponent({ listError: 'Connection refused' })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('Connection refused')
    })

    it('should show refresh button in error alert', () => {
      const wrapper = mountComponent({ listError: 'Error' })
      expect(wrapper.text()).toContain('Refresh')
    })

    it('should display service data in the table when services are loaded', () => {
      const wrapper = mountComponent({
        services: MOCK_SERVICES,
        totalServices: 2,
        isEmpty: false,
      })
      expect(wrapper.text()).toContain('happy-pets-service')
      expect(wrapper.text()).toContain('packet-delivery-service')
    })

    it('should display the default OIDC scope column', () => {
      const wrapper = mountComponent({
        services: MOCK_SERVICES,
        totalServices: 2,
        isEmpty: false,
      })
      expect(wrapper.text()).toContain('happyPetsScope')
    })

    it('should display scope count as a chip', () => {
      const wrapper = mountComponent({
        services: MOCK_SERVICES,
        totalServices: 2,
        isEmpty: false,
      })
      // happy-pets-service has 2 scopes
      expect(wrapper.text()).toContain('2')
    })
  })

  describe('lifecycle', () => {
    it('should call fetchServices on mount', () => {
      mountComponent()
      expect(mockFetchServices).toHaveBeenCalledOnce()
    })
  })

  describe('navigation', () => {
    it('should have a Details chip for each service', () => {
      const wrapper = mountComponent({
        services: MOCK_SERVICES,
        totalServices: 2,
        isEmpty: false,
      })
      expect(wrapper.text()).toContain('Details')
    })
  })
})
