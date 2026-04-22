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
 * Unit tests for the CCS (Credentials Config Service) Pinia store.
 *
 * Tests cover list fetching, detail fetching, CRUD operations,
 * error handling, and store reset.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCcsStore } from '@/stores/ccs'

/* ── Mock the API services ─────────────────────────────────────────── */

const mockGetServices = vi.fn()
const mockGetService = vi.fn()
const mockCreateService = vi.fn()
const mockUpdateService = vi.fn()
const mockDeleteServiceById = vi.fn()

vi.mock('@/api/generated/ccs', () => ({
  ServiceService: {
    getServices: (...args: unknown[]) => mockGetServices(...args),
    getService: (...args: unknown[]) => mockGetService(...args),
    createService: (...args: unknown[]) => mockCreateService(...args),
    updateService: (...args: unknown[]) => mockUpdateService(...args),
    deleteServiceById: (...args: unknown[]) => mockDeleteServiceById(...args),
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

const MOCK_SERVICE = {
  id: 'happy-pets-service',
  defaultOidcScope: 'default',
  oidcScopes: {
    default: {
      credentials: [
        {
          type: 'VerifiableCredential',
          trustedIssuersLists: ['https://til.example.com'],
        },
      ],
    },
  },
  authorizationType: 'FRONTEND_V2' as const,
}

const MOCK_SERVICES_RESPONSE = {
  total: 2,
  pageNumber: 0,
  pageSize: 10,
  services: [
    MOCK_SERVICE,
    {
      id: 'packet-delivery-service',
      defaultOidcScope: 'default',
      oidcScopes: {},
    },
  ],
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe('CCS Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const store = useCcsStore()
      expect(store.services).toEqual([])
      expect(store.totalServices).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedService).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })

    it('should compute isEmpty as true when list is empty and not loading', () => {
      const store = useCcsStore()
      expect(store.isEmpty).toBe(true)
    })

    it('should compute totalPages as at least 1', () => {
      const store = useCcsStore()
      expect(store.totalPages).toBe(1)
    })
  })

  describe('fetchServices', () => {
    it('should fetch services and update state on success', async () => {
      mockGetServices.mockResolvedValue(MOCK_SERVICES_RESPONSE)
      const store = useCcsStore()

      await store.fetchServices()

      expect(mockGetServices).toHaveBeenCalledWith({
        pageSize: 10,
        page: 0,
      })
      expect(store.services).toEqual(MOCK_SERVICES_RESPONSE.services)
      expect(store.totalServices).toBe(2)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
    })

    it('should set listLoading during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      mockGetServices.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = useCcsStore()

      const fetchPromise = store.fetchServices()
      expect(store.listLoading).toBe(true)

      resolvePromise!(MOCK_SERVICES_RESPONSE)
      await fetchPromise
      expect(store.listLoading).toBe(false)
    })

    it('should use custom page and size parameters', async () => {
      mockGetServices.mockResolvedValue(MOCK_SERVICES_RESPONSE)
      const store = useCcsStore()

      await store.fetchServices(3, 20)

      expect(mockGetServices).toHaveBeenCalledWith({
        pageSize: 20,
        page: 3,
      })
      expect(store.currentPage).toBe(3)
      expect(store.pageSize).toBe(20)
    })

    it.each([
      ['ApiError', (() => { const e = new Error('Bad Request'); e.name = 'ApiError'; return e })(), 'ApiError: Bad Request'],
      ['generic error', new Error('Network failure'), 'Error: Network failure'],
    ])('should handle %s on fetch failure', async (_label, error, expectedMessage) => {
      mockGetServices.mockRejectedValue(error)
      const store = useCcsStore()

      await store.fetchServices()

      expect(store.listError).toBe(expectedMessage)
      expect(store.services).toEqual([])
      expect(store.totalServices).toBe(0)
      expect(store.listLoading).toBe(false)
    })

    it('should handle empty response gracefully', async () => {
      mockGetServices.mockResolvedValue({ total: 0, services: [] })
      const store = useCcsStore()

      await store.fetchServices()

      expect(store.services).toEqual([])
      expect(store.totalServices).toBe(0)
      expect(store.isEmpty).toBe(true)
    })
  })

  describe('fetchServiceDetail', () => {
    it('should fetch service detail on success', async () => {
      mockGetService.mockResolvedValue(MOCK_SERVICE)
      const store = useCcsStore()

      await store.fetchServiceDetail('happy-pets-service')

      expect(mockGetService).toHaveBeenCalledWith({ id: 'happy-pets-service' })
      expect(store.selectedService).toEqual(MOCK_SERVICE)
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })

    it('should clear selectedService before fetching', async () => {
      mockGetService.mockResolvedValue(MOCK_SERVICE)
      const store = useCcsStore()
      store.selectedService = { id: 'old' } as any

      const promise = store.fetchServiceDetail('happy-pets-service')
      expect(store.selectedService).toBeNull()
      await promise
    })

    it('should handle errors on detail fetch failure', async () => {
      mockGetService.mockRejectedValue(new Error('Not Found'))
      const store = useCcsStore()

      await store.fetchServiceDetail('nonexistent')

      expect(store.detailError).toBeTruthy()
      expect(store.selectedService).toBeNull()
      expect(store.detailLoading).toBe(false)
    })
  })

  describe('createService', () => {
    it('should return true on success', async () => {
      mockCreateService.mockResolvedValue('Location: /service/new-service')
      const store = useCcsStore()

      const result = await store.createService(MOCK_SERVICE)

      expect(result).toBe(true)
      expect(mockCreateService).toHaveBeenCalledWith({
        requestBody: MOCK_SERVICE,
      })
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockCreateService.mockRejectedValue(new Error('Conflict'))
      const store = useCcsStore()

      const result = await store.createService(MOCK_SERVICE)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
      expect(store.saving).toBe(false)
    })

    it('should set saving to true during operation', async () => {
      let resolvePromise: (value: unknown) => void
      mockCreateService.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )
      const store = useCcsStore()

      const promise = store.createService(MOCK_SERVICE)
      expect(store.saving).toBe(true)

      resolvePromise!(undefined)
      await promise
      expect(store.saving).toBe(false)
    })
  })

  describe('updateService', () => {
    it('should return true and update selectedService on success', async () => {
      const updated = { ...MOCK_SERVICE, defaultOidcScope: 'updated' }
      mockUpdateService.mockResolvedValue(updated)
      const store = useCcsStore()

      const result = await store.updateService('happy-pets-service', MOCK_SERVICE)

      expect(result).toBe(true)
      expect(mockUpdateService).toHaveBeenCalledWith({
        id: 'happy-pets-service',
        requestBody: MOCK_SERVICE,
      })
      expect(store.selectedService).toEqual(updated)
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockUpdateService.mockRejectedValue(new Error('Bad Request'))
      const store = useCcsStore()

      const result = await store.updateService('happy-pets-service', MOCK_SERVICE)

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('deleteService', () => {
    it('should return true and clear selectedService on success', async () => {
      mockDeleteServiceById.mockResolvedValue(undefined)
      const store = useCcsStore()
      store.selectedService = MOCK_SERVICE as any

      const result = await store.deleteService('happy-pets-service')

      expect(result).toBe(true)
      expect(mockDeleteServiceById).toHaveBeenCalledWith({
        id: 'happy-pets-service',
      })
      expect(store.selectedService).toBeNull()
      expect(store.saveError).toBeNull()
    })

    it('should return false and set saveError on failure', async () => {
      mockDeleteServiceById.mockRejectedValue(new Error('Not Found'))
      const store = useCcsStore()

      const result = await store.deleteService('nonexistent')

      expect(result).toBe(false)
      expect(store.saveError).toBeTruthy()
    })
  })

  describe('$reset', () => {
    it('should reset all state to initial values', async () => {
      mockGetServices.mockResolvedValue(MOCK_SERVICES_RESPONSE)
      const store = useCcsStore()

      // Populate state
      await store.fetchServices()
      store.listError = 'some error'
      store.selectedService = MOCK_SERVICE as any
      store.saving = true
      store.saveError = 'save error'

      store.$reset()

      expect(store.services).toEqual([])
      expect(store.totalServices).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedService).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
      expect(store.saving).toBe(false)
      expect(store.saveError).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('should compute isEmpty as false when services are loaded', async () => {
      mockGetServices.mockResolvedValue(MOCK_SERVICES_RESPONSE)
      const store = useCcsStore()

      await store.fetchServices()

      expect(store.isEmpty).toBe(false)
    })

    it('should compute isEmpty as false while loading', () => {
      const store = useCcsStore()
      store.listLoading = true

      expect(store.isEmpty).toBe(false)
    })

    it('should compute totalPages correctly', async () => {
      mockGetServices.mockResolvedValue({
        ...MOCK_SERVICES_RESPONSE,
        total: 35,
      })
      const store = useCcsStore()

      await store.fetchServices(0, 10)

      expect(store.totalPages).toBe(4)
    })
  })
})
