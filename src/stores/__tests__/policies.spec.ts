/**
 * Unit tests for the ODRL Policies Pinia store.
 *
 * Tests cover list fetching, detail fetching, CRUD operations,
 * service-related actions, error handling, and store reset.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePoliciesStore } from '@/stores/policies'

/* ── Mock the API services ─────────────────────────────────────────── */

const mockGetPolicies = vi.fn()
const mockGetPolicyById = vi.fn()
const mockCreatePolicy = vi.fn()
const mockCreatePolicyWithId = vi.fn()
const mockDeletePolicyById = vi.fn()

const mockGetServices = vi.fn()
const mockCreateService = vi.fn()
const mockDeleteService = vi.fn()
const mockGetServicePolicies = vi.fn()
const mockGetServicePolicyById = vi.fn()
const mockCreateServicePolicy = vi.fn()
const mockCreateServicePolicyWithId = vi.fn()
const mockDeleteServicePolicyById = vi.fn()

vi.mock('@/api/generated/odrl', () => ({
  PolicyService: {
    getPolicies: (...args: unknown[]) => mockGetPolicies(...args),
    getPolicyById: (...args: unknown[]) => mockGetPolicyById(...args),
    createPolicy: (...args: unknown[]) => mockCreatePolicy(...args),
    createPolicyWithId: (...args: unknown[]) => mockCreatePolicyWithId(...args),
    deletePolicyById: (...args: unknown[]) => mockDeletePolicyById(...args),
  },
  ServiceService: {
    getServices: (...args: unknown[]) => mockGetServices(...args),
    createService: (...args: unknown[]) => mockCreateService(...args),
    deleteService: (...args: unknown[]) => mockDeleteService(...args),
    getServicePolicies: (...args: unknown[]) => mockGetServicePolicies(...args),
    getServicePolicyById: (...args: unknown[]) => mockGetServicePolicyById(...args),
    createServicePolicy: (...args: unknown[]) => mockCreateServicePolicy(...args),
    createServicePolicyWithId: (...args: unknown[]) => mockCreateServicePolicyWithId(...args),
    deleteServicePolicyById: (...args: unknown[]) => mockDeleteServicePolicyById(...args),
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

const MOCK_ODRL_JSON = {
  '@context': 'http://www.w3.org/ns/odrl.jsonld',
  '@type': 'Set',
  uid: 'urn:policy:example-1',
  permission: [
    {
      target: 'urn:asset:example',
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
}

const MOCK_POLICY = {
  id: 'policy-1',
  'odrl:uid': 'urn:policy:example-1',
  odrl: JSON.stringify(MOCK_ODRL_JSON),
  rego: 'package policy\ndefault allow = false',
}

const MOCK_POLICY_2 = {
  id: 'policy-2',
  'odrl:uid': 'urn:policy:example-2',
  odrl: JSON.stringify({ '@type': 'Offer', uid: 'urn:policy:example-2' }),
  rego: 'package policy2',
}

const MOCK_POLICY_3 = {
  id: 'policy-3',
  'odrl:uid': 'urn:policy:example-3',
  odrl: JSON.stringify({ '@type': 'Agreement', uid: 'urn:policy:example-3' }),
  rego: 'package policy3',
}

/** PolicyList is a flat array (not wrapped in object). */
const MOCK_POLICY_LIST = [MOCK_POLICY, MOCK_POLICY_2, MOCK_POLICY_3]

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('Policies Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const store = usePoliciesStore()
      expect(store.policies).toEqual([])
      expect(store.totalPolicies).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedPolicy).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
      expect(store.services).toEqual([])
      expect(store.servicesLoading).toBe(false)
      expect(store.serviceError).toBeNull()
      expect(store.savingService).toBe(false)
    })

    it('should compute isEmpty as true when list is empty and not loading', () => {
      const store = usePoliciesStore()
      expect(store.isEmpty).toBe(true)
    })

    it('should compute totalPages as at least 1', () => {
      const store = usePoliciesStore()
      expect(store.totalPages).toBe(1)
    })
  })

  describe('fetchPolicies', () => {
    it('should fetch policies and update state on success', async () => {
      mockGetPolicies.mockResolvedValue(MOCK_POLICY_LIST)
      const store = usePoliciesStore()

      await store.fetchPolicies()

      expect(mockGetPolicies).toHaveBeenCalledWith({
        pageSize: 10,
        page: 0,
      })
      expect(store.policies).toEqual(MOCK_POLICY_LIST)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
    })

    it('should estimate total when full page returned', async () => {
      // Return exactly pageSize items — store should assume more pages exist
      const fullPage = Array.from({ length: 10 }, (_, i) => ({
        id: `policy-${i}`,
        odrl: '{}',
      }))
      mockGetPolicies.mockResolvedValue(fullPage)
      const store = usePoliciesStore()

      await store.fetchPolicies(0, 10)

      // (0 + 2) * 10 = 20
      expect(store.totalPolicies).toBe(20)
    })

    it('should calculate exact total when partial page returned', async () => {
      mockGetPolicies.mockResolvedValue(MOCK_POLICY_LIST)
      const store = usePoliciesStore()

      await store.fetchPolicies(0, 10)

      // 0 * 10 + 3 = 3
      expect(store.totalPolicies).toBe(3)
    })

    it('should set listLoading during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      mockGetPolicies.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = usePoliciesStore()

      const fetchPromise = store.fetchPolicies()
      expect(store.listLoading).toBe(true)

      resolvePromise!(MOCK_POLICY_LIST)
      await fetchPromise
      expect(store.listLoading).toBe(false)
    })

    it('should use custom page and size parameters', async () => {
      mockGetPolicies.mockResolvedValue([])
      const store = usePoliciesStore()

      await store.fetchPolicies(2, 5)

      expect(mockGetPolicies).toHaveBeenCalledWith({
        pageSize: 5,
        page: 2,
      })
      expect(store.currentPage).toBe(2)
      expect(store.pageSize).toBe(5)
    })

    it.each([
      ['ApiError', (() => { const e = new Error('Server Error'); e.name = 'ApiError'; return e })(), 'ApiError: Server Error'],
      ['generic error', new Error('Network failure'), 'Error: Network failure'],
    ])('should handle %s on fetch failure', async (_label, error, expectedMessage) => {
      mockGetPolicies.mockRejectedValue(error)
      const store = usePoliciesStore()

      await store.fetchPolicies()

      expect(store.listError).toBe(expectedMessage)
      expect(store.policies).toEqual([])
      expect(store.totalPolicies).toBe(0)
      expect(store.listLoading).toBe(false)
    })

    it('should handle null/undefined response', async () => {
      mockGetPolicies.mockResolvedValue(null)
      const store = usePoliciesStore()

      await store.fetchPolicies()

      expect(store.policies).toEqual([])
      expect(store.totalPolicies).toBe(0)
    })
  })

  describe('fetchPolicyDetail', () => {
    it('should fetch policy detail on success', async () => {
      mockGetPolicyById.mockResolvedValue(MOCK_POLICY)
      const store = usePoliciesStore()

      await store.fetchPolicyDetail('policy-1')

      expect(mockGetPolicyById).toHaveBeenCalledWith({ id: 'policy-1' })
      expect(store.selectedPolicy).toEqual(MOCK_POLICY)
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })

    it('should clear selectedPolicy before fetching', async () => {
      mockGetPolicyById.mockResolvedValue(MOCK_POLICY)
      const store = usePoliciesStore()
      store.selectedPolicy = MOCK_POLICY_2 as any

      const promise = store.fetchPolicyDetail('policy-1')
      expect(store.selectedPolicy).toBeNull()
      await promise
    })

    it('should handle errors on detail fetch failure', async () => {
      mockGetPolicyById.mockRejectedValue(new Error('Not Found'))
      const store = usePoliciesStore()

      await store.fetchPolicyDetail('nonexistent')

      expect(store.detailError).toBeTruthy()
      expect(store.selectedPolicy).toBeNull()
      expect(store.detailLoading).toBe(false)
    })
  })

  describe('createPolicy', () => {
    it('should return true on success', async () => {
      mockCreatePolicy.mockResolvedValue('rego code')
      const store = usePoliciesStore()

      const result = await store.createPolicy(MOCK_ODRL_JSON)

      expect(result).toBe(true)
      expect(mockCreatePolicy).toHaveBeenCalledWith({
        requestBody: MOCK_ODRL_JSON,
      })
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockCreatePolicy.mockRejectedValue(new Error('Bad Request'))
      const store = usePoliciesStore()

      const result = await store.createPolicy(MOCK_ODRL_JSON)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
      expect(store.saving).toBe(false)
    })

    it('should set saving to true during operation', async () => {
      let resolvePromise: (value: unknown) => void
      mockCreatePolicy.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = usePoliciesStore()

      const promise = store.createPolicy(MOCK_ODRL_JSON)
      expect(store.saving).toBe(true)

      resolvePromise!('rego')
      await promise
      expect(store.saving).toBe(false)
    })
  })

  describe('updatePolicy', () => {
    it('should return true on success', async () => {
      mockCreatePolicyWithId.mockResolvedValue('rego code')
      const store = usePoliciesStore()

      const result = await store.updatePolicy('policy-1', MOCK_ODRL_JSON)

      expect(result).toBe(true)
      expect(mockCreatePolicyWithId).toHaveBeenCalledWith({
        id: 'policy-1',
        requestBody: MOCK_ODRL_JSON,
      })
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockCreatePolicyWithId.mockRejectedValue(new Error('Conflict'))
      const store = usePoliciesStore()

      const result = await store.updatePolicy('policy-1', MOCK_ODRL_JSON)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('deletePolicy', () => {
    it('should return true and clear selectedPolicy on success', async () => {
      mockDeletePolicyById.mockResolvedValue(undefined)
      const store = usePoliciesStore()
      store.selectedPolicy = MOCK_POLICY as any

      const result = await store.deletePolicy('policy-1')

      expect(result).toBe(true)
      expect(mockDeletePolicyById).toHaveBeenCalledWith({ id: 'policy-1' })
      expect(store.selectedPolicy).toBeNull()
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockDeletePolicyById.mockRejectedValue(new Error('Not Found'))
      const store = usePoliciesStore()

      const result = await store.deletePolicy('nonexistent')

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('service actions', () => {
    it('fetchServices should populate services list', async () => {
      const mockServiceList = [{ id: 'svc-1' }, { id: 'svc-2' }]
      mockGetServices.mockResolvedValue(mockServiceList)
      const store = usePoliciesStore()

      await store.fetchServices()

      expect(store.services).toEqual(mockServiceList)
      expect(store.servicesLoading).toBe(false)
      expect(store.serviceError).toBeNull()
    })

    it('fetchServices should handle errors', async () => {
      mockGetServices.mockRejectedValue(new Error('Service unavailable'))
      const store = usePoliciesStore()

      await store.fetchServices()

      expect(store.services).toEqual([])
      expect(store.serviceError).toBeTruthy()
    })

    it('createService should return true on success', async () => {
      mockCreateService.mockResolvedValue({ policyPath: '/service/new-svc/policy' })
      const store = usePoliciesStore()

      const result = await store.createService('new-svc')

      expect(result).toBe(true)
      expect(mockCreateService).toHaveBeenCalledWith({
        requestBody: { id: 'new-svc' },
      })
      expect(store.savingService).toBe(false)
    })

    it('createService should return false on failure', async () => {
      mockCreateService.mockRejectedValue(new Error('Conflict'))
      const store = usePoliciesStore()

      const result = await store.createService('existing-svc')

      expect(result).toBe(false)
      expect(store.serviceError).toBeTruthy()
    })

    it('deleteService should return true on success', async () => {
      mockDeleteService.mockResolvedValue(undefined)
      const store = usePoliciesStore()

      const result = await store.deleteService('svc-1')

      expect(result).toBe(true)
      expect(mockDeleteService).toHaveBeenCalledWith({ serviceId: 'svc-1' })
    })

    it('deleteService should return false on failure', async () => {
      mockDeleteService.mockRejectedValue(new Error('Not Found'))
      const store = usePoliciesStore()

      const result = await store.deleteService('nonexistent')

      expect(result).toBe(false)
      expect(store.serviceError).toBeTruthy()
    })

    it('fetchServicePolicies should return policies array', async () => {
      mockGetServicePolicies.mockResolvedValue(MOCK_POLICY_LIST)
      const store = usePoliciesStore()

      const result = await store.fetchServicePolicies('svc-1')

      expect(result).toEqual(MOCK_POLICY_LIST)
      expect(mockGetServicePolicies).toHaveBeenCalledWith({
        serviceId: 'svc-1',
        page: 0,
        pageSize: 10,
      })
    })

    it('fetchServicePolicies should return empty array on error', async () => {
      mockGetServicePolicies.mockRejectedValue(new Error('Not Found'))
      const store = usePoliciesStore()

      const result = await store.fetchServicePolicies('nonexistent')

      expect(result).toEqual([])
      expect(store.serviceError).toBeTruthy()
    })

    it('fetchServicePolicyDetail should fetch and set selectedPolicy', async () => {
      mockGetServicePolicyById.mockResolvedValue(MOCK_POLICY)
      const store = usePoliciesStore()

      await store.fetchServicePolicyDetail('svc-1', 'policy-1')

      expect(store.selectedPolicy).toEqual(MOCK_POLICY)
      expect(mockGetServicePolicyById).toHaveBeenCalledWith({
        serviceId: 'svc-1',
        id: 'policy-1',
      })
    })

    it('createServicePolicy should return true on success', async () => {
      mockCreateServicePolicy.mockResolvedValue('rego')
      const store = usePoliciesStore()

      const result = await store.createServicePolicy('svc-1', MOCK_ODRL_JSON)

      expect(result).toBe(true)
      expect(mockCreateServicePolicy).toHaveBeenCalledWith({
        serviceId: 'svc-1',
        requestBody: MOCK_ODRL_JSON,
      })
    })

    it('updateServicePolicy should return true on success', async () => {
      mockCreateServicePolicyWithId.mockResolvedValue('rego')
      const store = usePoliciesStore()

      const result = await store.updateServicePolicy('svc-1', 'policy-1', MOCK_ODRL_JSON)

      expect(result).toBe(true)
      expect(mockCreateServicePolicyWithId).toHaveBeenCalledWith({
        serviceId: 'svc-1',
        id: 'policy-1',
        requestBody: MOCK_ODRL_JSON,
      })
    })

    it('deleteServicePolicy should return true on success', async () => {
      mockDeleteServicePolicyById.mockResolvedValue(undefined)
      const store = usePoliciesStore()

      const result = await store.deleteServicePolicy('svc-1', 'policy-1')

      expect(result).toBe(true)
      expect(mockDeleteServicePolicyById).toHaveBeenCalledWith({
        serviceId: 'svc-1',
        id: 'policy-1',
      })
      expect(store.selectedPolicy).toBeNull()
    })
  })

  describe('$reset', () => {
    it('should reset all state to initial values', async () => {
      mockGetPolicies.mockResolvedValue(MOCK_POLICY_LIST)
      const store = usePoliciesStore()

      // Populate state
      await store.fetchPolicies()
      store.listError = 'some error'
      store.selectedPolicy = MOCK_POLICY as any
      store.saving = true
      store.saveError = 'save error'
      store.services = [{ id: 'svc-1' }]
      store.servicesLoading = true
      store.serviceError = 'svc error'
      store.savingService = true

      store.$reset()

      expect(store.policies).toEqual([])
      expect(store.totalPolicies).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedPolicy).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
      expect(store.services).toEqual([])
      expect(store.servicesLoading).toBe(false)
      expect(store.serviceError).toBeNull()
      expect(store.savingService).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should compute isEmpty as false when policies are loaded', async () => {
      mockGetPolicies.mockResolvedValue(MOCK_POLICY_LIST)
      const store = usePoliciesStore()

      await store.fetchPolicies()

      expect(store.isEmpty).toBe(false)
    })

    it('should compute isEmpty as false while loading', () => {
      const store = usePoliciesStore()
      store.listLoading = true

      expect(store.isEmpty).toBe(false)
    })

    it('should compute totalPages correctly', () => {
      const store = usePoliciesStore()
      store.totalPolicies = 25
      store.pageSize = 10

      expect(store.totalPages).toBe(3)
    })
  })
})
