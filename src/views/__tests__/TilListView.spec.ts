/**
 * Component tests for TilListView.
 *
 * Verifies loading, error, and populated states, as well as
 * navigation behaviour on row click.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TilListView from '@/views/til/TilListView.vue'
import en from '@/locales/en.json'

/* ── Mock router ────────────────────────────────────────────────── */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {} }),
}))

/* ── Mock TIL store ─────────────────────────────────────────────── */
const mockFetchIssuers = vi.fn()

vi.mock('@/stores/til', () => ({
  useTilStore: vi.fn(),
}))

import { useTilStore } from '@/stores/til'
const mockUseTilStore = vi.mocked(useTilStore)

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Create a fresh i18n instance for testing. */
function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  })
}

/** Create a fresh Vuetify instance for testing. */
function createTestVuetify() {
  return createVuetify({ components, directives })
}

/** Default mock store state for a populated list. */
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
    fetchIssuers: mockFetchIssuers,
    fetchIssuerDetail: vi.fn(),
    createIssuer: vi.fn(),
    updateIssuer: vi.fn(),
    deleteIssuer: vi.fn(),
    $reset: vi.fn(),
    ...overrides,
  }
}

/** Mount TilListView with all required plugins. */
function mountComponent(storeOverrides: Record<string, unknown> = {}): VueWrapper {
  const storeState = createMockStoreState(storeOverrides)
  mockUseTilStore.mockReturnValue(storeState as any)

  return mount(TilListView, {
    global: {
      plugins: [createPinia(), createTestI18n(), createTestVuetify()],
      stubs: {
        'router-link': true,
      },
    },
  })
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('TilListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('rendering states', () => {
    it('should render the page title', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Trusted Issuers')
    })

    it('should render a create button', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Create Trusted Issuer')
    })

    it('should show loading skeleton when listLoading is true', () => {
      const wrapper = mountComponent({ listLoading: true })
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
    })

    it('should show error alert when listError is set', () => {
      const wrapper = mountComponent({ listError: 'Test error message' })
      const alert = wrapper.findComponent({ name: 'v-alert' })
      expect(alert.exists()).toBe(true)
      expect(wrapper.text()).toContain('Test error message')
    })

    it('should show refresh button in error alert', () => {
      const wrapper = mountComponent({ listError: 'Test error' })
      expect(wrapper.text()).toContain('Refresh')
    })

    it('should display issuer data in the table when issuers are loaded', () => {
      const wrapper = mountComponent({
        issuers: [
          { did: 'did:example:1', href: '/v4/issuers/did:example:1' },
          { did: 'did:example:2', href: '/v4/issuers/did:example:2' },
        ],
        totalIssuers: 2,
        isEmpty: false,
      })
      expect(wrapper.text()).toContain('did:example:1')
      expect(wrapper.text()).toContain('did:example:2')
    })
  })

  describe('lifecycle', () => {
    it('should call fetchIssuers on mount', () => {
      mountComponent()
      expect(mockFetchIssuers).toHaveBeenCalledOnce()
    })
  })

  describe('navigation', () => {
    it('should have a Details chip for each issuer', () => {
      const wrapper = mountComponent({
        issuers: [{ did: 'did:example:1', href: '/v4/issuers/did:example:1' }],
        totalIssuers: 1,
        isEmpty: false,
      })
      expect(wrapper.text()).toContain('Details')
    })
  })
})
