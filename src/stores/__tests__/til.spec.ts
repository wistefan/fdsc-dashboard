/**
 * Unit tests for the TIL (Trusted Issuers List) Pinia store.
 *
 * Tests cover list fetching, detail fetching, CRUD operations,
 * error handling, and store reset.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTilStore } from '@/stores/til'

/* ── Mock the API services ─────────────────────────────────────────── */

const mockGetIssuersV4 = vi.fn()
const mockGetIssuer = vi.fn()
const mockCreateTrustedIssuer = vi.fn()
const mockUpdateIssuer = vi.fn()
const mockDeleteIssuerById = vi.fn()

vi.mock('@/api/generated/tir', () => ({
  TirService: {
    getIssuersV4: (...args: unknown[]) => mockGetIssuersV4(...args),
  },
  ApiError: class ApiError extends Error {
    public readonly status: number
    constructor(message: string, status = 500) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

vi.mock('@/api/generated/til', () => ({
  IssuerService: {
    getIssuer: (...args: unknown[]) => mockGetIssuer(...args),
    createTrustedIssuer: (...args: unknown[]) => mockCreateTrustedIssuer(...args),
    updateIssuer: (...args: unknown[]) => mockUpdateIssuer(...args),
    deleteIssuerById: (...args: unknown[]) => mockDeleteIssuerById(...args),
  },
  ApiError: class ApiError extends Error {
    public readonly status: number
    constructor(message: string, status = 500) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

/* ── Test data ─────────────────────────────────────────────────────── */

const MOCK_ISSUERS_RESPONSE = {
  self: '/v4/issuers/',
  items: [
    { did: 'did:example:1', attributes: [] },
    { did: 'did:example:2', attributes: [] },
  ],
  total: 2,
  pageSize: 10,
  links: {},
}

const MOCK_ISSUER_DETAIL = {
  did: 'did:example:1',
  credentials: [
    {
      type: 'VerifiableCredential',
      validFor: { from: '2024-01-01T00:00:00Z', to: '2025-01-01T00:00:00Z' },
      claims: [],
    },
  ],
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('TIL Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const store = useTilStore()
      expect(store.issuers).toEqual([])
      expect(store.totalIssuers).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedIssuer).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })

    it('should compute isEmpty as true when list is empty and not loading', () => {
      const store = useTilStore()
      expect(store.isEmpty).toBe(true)
    })

    it('should compute totalPages as at least 1', () => {
      const store = useTilStore()
      expect(store.totalPages).toBe(1)
    })
  })

  describe('fetchIssuers', () => {
    it('should fetch issuers and update state on success', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_ISSUERS_RESPONSE)
      const store = useTilStore()

      await store.fetchIssuers()

      expect(mockGetIssuersV4).toHaveBeenCalledWith({
        pageSize: 10,
        pageAfter: undefined,
      })
      expect(store.issuers).toEqual(MOCK_ISSUERS_RESPONSE.items)
      expect(store.totalIssuers).toBe(2)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
    })

    it('should set listLoading during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      mockGetIssuersV4.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = useTilStore()

      const fetchPromise = store.fetchIssuers()
      expect(store.listLoading).toBe(true)

      resolvePromise!(MOCK_ISSUERS_RESPONSE)
      await fetchPromise
      expect(store.listLoading).toBe(false)
    })

    it('should use custom page and size parameters', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_ISSUERS_RESPONSE)
      const store = useTilStore()

      await store.fetchIssuers(2, 5)

      expect(mockGetIssuersV4).toHaveBeenCalledWith({
        pageSize: 5,
        pageAfter: 10,
      })
      expect(store.currentPage).toBe(2)
      expect(store.pageSize).toBe(5)
    })

    it.each([
      ['ApiError', (() => { const e = new Error('Not Found'); e.name = 'ApiError'; return e })(), 'ApiError: Not Found'],
      ['generic error', new Error('Network failure'), 'Error: Network failure'],
    ])('should handle %s on fetch failure', async (_label, error, expectedMessage) => {
      mockGetIssuersV4.mockRejectedValue(error)
      const store = useTilStore()

      await store.fetchIssuers()

      expect(store.listError).toBe(expectedMessage)
      expect(store.issuers).toEqual([])
      expect(store.totalIssuers).toBe(0)
      expect(store.listLoading).toBe(false)
    })
  })

  describe('fetchIssuerDetail', () => {
    it('should fetch issuer detail on success', async () => {
      mockGetIssuer.mockResolvedValue(MOCK_ISSUER_DETAIL)
      const store = useTilStore()

      await store.fetchIssuerDetail('did:example:1')

      expect(mockGetIssuer).toHaveBeenCalledWith({ did: 'did:example:1' })
      expect(store.selectedIssuer).toEqual(MOCK_ISSUER_DETAIL)
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })

    it('should clear selectedIssuer before fetching', async () => {
      mockGetIssuer.mockResolvedValue(MOCK_ISSUER_DETAIL)
      const store = useTilStore()
      store.selectedIssuer = { did: 'old' } as any

      const promise = store.fetchIssuerDetail('did:example:1')
      // selectedIssuer should be null during fetch
      expect(store.selectedIssuer).toBeNull()
      await promise
    })

    it('should handle errors on detail fetch failure', async () => {
      mockGetIssuer.mockRejectedValue(new Error('Not Found'))
      const store = useTilStore()

      await store.fetchIssuerDetail('did:nonexistent')

      expect(store.detailError).toBeTruthy()
      expect(store.selectedIssuer).toBeNull()
      expect(store.detailLoading).toBe(false)
    })
  })

  describe('createIssuer', () => {
    it('should return true on success', async () => {
      mockCreateTrustedIssuer.mockResolvedValue(undefined)
      const store = useTilStore()

      const result = await store.createIssuer(MOCK_ISSUER_DETAIL)

      expect(result).toBe(true)
      expect(mockCreateTrustedIssuer).toHaveBeenCalledWith({
        requestBody: MOCK_ISSUER_DETAIL,
      })
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockCreateTrustedIssuer.mockRejectedValue(new Error('Conflict'))
      const store = useTilStore()

      const result = await store.createIssuer(MOCK_ISSUER_DETAIL)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
      expect(store.saving).toBe(false)
    })

    it('should set saving to true during operation', async () => {
      let resolvePromise: (value: unknown) => void
      mockCreateTrustedIssuer.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = useTilStore()

      const promise = store.createIssuer(MOCK_ISSUER_DETAIL)
      expect(store.saving).toBe(true)

      resolvePromise!(undefined)
      await promise
      expect(store.saving).toBe(false)
    })
  })

  describe('updateIssuer', () => {
    it('should return true and update selectedIssuer on success', async () => {
      const updated = { ...MOCK_ISSUER_DETAIL, did: 'did:example:1' }
      mockUpdateIssuer.mockResolvedValue(updated)
      const store = useTilStore()

      const result = await store.updateIssuer('did:example:1', MOCK_ISSUER_DETAIL)

      expect(result).toBe(true)
      expect(mockUpdateIssuer).toHaveBeenCalledWith({
        did: 'did:example:1',
        requestBody: MOCK_ISSUER_DETAIL,
      })
      expect(store.selectedIssuer).toEqual(updated)
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockUpdateIssuer.mockRejectedValue(new Error('Bad Request'))
      const store = useTilStore()

      const result = await store.updateIssuer('did:example:1', MOCK_ISSUER_DETAIL)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('deleteIssuer', () => {
    it('should return true and clear selectedIssuer on success', async () => {
      mockDeleteIssuerById.mockResolvedValue(undefined)
      const store = useTilStore()
      store.selectedIssuer = MOCK_ISSUER_DETAIL as any

      const result = await store.deleteIssuer('did:example:1')

      expect(result).toBe(true)
      expect(mockDeleteIssuerById).toHaveBeenCalledWith({ did: 'did:example:1' })
      expect(store.selectedIssuer).toBeNull()
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockDeleteIssuerById.mockRejectedValue(new Error('Not Found'))
      const store = useTilStore()

      const result = await store.deleteIssuer('did:nonexistent')

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('$reset', () => {
    it('should reset all state to initial values', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_ISSUERS_RESPONSE)
      const store = useTilStore()

      // Populate state
      await store.fetchIssuers()
      store.listError = 'some error'
      store.selectedIssuer = MOCK_ISSUER_DETAIL as any
      store.saving = true
      store.saveError = 'save error'

      store.$reset()

      expect(store.issuers).toEqual([])
      expect(store.totalIssuers).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedIssuer).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('should compute isEmpty as false when issuers are loaded', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_ISSUERS_RESPONSE)
      const store = useTilStore()

      await store.fetchIssuers()

      expect(store.isEmpty).toBe(false)
    })

    it('should compute isEmpty as false while loading', () => {
      const store = useTilStore()
      store.listLoading = true

      expect(store.isEmpty).toBe(false)
    })

    it('should compute totalPages correctly', async () => {
      mockGetIssuersV4.mockResolvedValue({
        ...MOCK_ISSUERS_RESPONSE,
        total: 25,
      })
      const store = useTilStore()

      await store.fetchIssuers(0, 10)

      expect(store.totalPages).toBe(3)
    })
  })
})
