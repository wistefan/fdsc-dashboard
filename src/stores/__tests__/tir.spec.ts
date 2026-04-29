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
 * Unit tests for the TIR (Trusted Issuers Registry) Pinia store.
 *
 * Tests cover list fetching, detail fetching, error handling,
 * and store reset. The TIR store is read-only — no CRUD tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTirStore } from '@/stores/tir'

/* -- Mock the API service ------------------------------------------------- */

const mockGetIssuersV4 = vi.fn()
const mockGetIssuerV4 = vi.fn()

vi.mock('@/api/generated/tir', () => ({
  TirService: {
    getIssuersV4: (...args: unknown[]) => mockGetIssuersV4(...args),
    getIssuerV4: (...args: unknown[]) => mockGetIssuerV4(...args),
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

/* -- Test data ------------------------------------------------------------ */

const MOCK_PARTICIPANTS_RESPONSE = {
  self: '/v4/issuers/',
  items: [
    { did: 'did:example:1', href: '/v4/issuers/did:example:1' },
    { did: 'did:example:2', href: '/v4/issuers/did:example:2' },
  ],
  total: 2,
  pageSize: 10,
  links: {},
}

const MOCK_PARTICIPANT_DETAIL = {
  did: 'did:example:1',
  attributes: [
    {
      hash: 'abc123',
      body: 'eyJ0ZXN0IjogdHJ1ZX0=',
      issuerType: 'TI' as const,
      tao: 'did:example:tao',
      rootTao: 'did:example:root',
    },
  ],
}

/* -- Tests ---------------------------------------------------------------- */

describe('TIR Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const store = useTirStore()
      expect(store.participants).toEqual([])
      expect(store.totalParticipants).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedParticipant).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })

    it('should compute isEmpty as true when list is empty and not loading', () => {
      const store = useTirStore()
      expect(store.isEmpty).toBe(true)
    })

    it('should compute totalPages as at least 1', () => {
      const store = useTirStore()
      expect(store.totalPages).toBe(1)
    })
  })

  describe('fetchParticipants', () => {
    it('should fetch participants and update state on success', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_PARTICIPANTS_RESPONSE)
      const store = useTirStore()

      await store.fetchParticipants()

      expect(mockGetIssuersV4).toHaveBeenCalledWith({
        pageSize: 10,
        pageAfter: undefined,
      })
      expect(store.participants).toEqual(MOCK_PARTICIPANTS_RESPONSE.items)
      expect(store.totalParticipants).toBe(2)
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
      const store = useTirStore()

      const fetchPromise = store.fetchParticipants()
      expect(store.listLoading).toBe(true)

      resolvePromise!(MOCK_PARTICIPANTS_RESPONSE)
      await fetchPromise
      expect(store.listLoading).toBe(false)
    })

    it('should use custom page and size parameters', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_PARTICIPANTS_RESPONSE)
      const store = useTirStore()

      await store.fetchParticipants(2, 5)

      expect(mockGetIssuersV4).toHaveBeenCalledWith({
        pageSize: 5,
        pageAfter: 10,
      })
      expect(store.currentPage).toBe(2)
      expect(store.pageSize).toBe(5)
    })

    it.each([
      [
        'ApiError',
        (() => {
          const e = new Error('Not Found')
          e.name = 'ApiError'
          return e
        })(),
        'ApiError: Not Found',
      ],
      ['generic error', new Error('Network failure'), 'Error: Network failure'],
    ])(
      'should handle %s on fetch failure',
      async (_label, error, expectedMessage) => {
        mockGetIssuersV4.mockRejectedValue(error)
        const store = useTirStore()

        await store.fetchParticipants()

        expect(store.listError).toBe(expectedMessage)
        expect(store.participants).toEqual([])
        expect(store.totalParticipants).toBe(0)
        expect(store.listLoading).toBe(false)
      },
    )
  })

  describe('fetchParticipantDetail', () => {
    it('should fetch participant detail on success', async () => {
      mockGetIssuerV4.mockResolvedValue(MOCK_PARTICIPANT_DETAIL)
      const store = useTirStore()

      await store.fetchParticipantDetail('did:example:1')

      expect(mockGetIssuerV4).toHaveBeenCalledWith({ did: 'did:example:1' })
      expect(store.selectedParticipant).toEqual(MOCK_PARTICIPANT_DETAIL)
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })

    it('should clear selectedParticipant before fetching', async () => {
      mockGetIssuerV4.mockResolvedValue(MOCK_PARTICIPANT_DETAIL)
      const store = useTirStore()
      store.selectedParticipant = { did: 'old' } as any

      const promise = store.fetchParticipantDetail('did:example:1')
      expect(store.selectedParticipant).toBeNull()
      await promise
    })

    it('should handle errors on detail fetch failure', async () => {
      mockGetIssuerV4.mockRejectedValue(new Error('Not Found'))
      const store = useTirStore()

      await store.fetchParticipantDetail('did:nonexistent')

      expect(store.detailError).toBeTruthy()
      expect(store.selectedParticipant).toBeNull()
      expect(store.detailLoading).toBe(false)
    })
  })

  describe('$reset', () => {
    it('should reset all state to initial values', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_PARTICIPANTS_RESPONSE)
      const store = useTirStore()

      await store.fetchParticipants()
      store.listError = 'some error'
      store.selectedParticipant = MOCK_PARTICIPANT_DETAIL as any

      store.$reset()

      expect(store.participants).toEqual([])
      expect(store.totalParticipants).toBe(0)
      expect(store.pageSize).toBe(10)
      expect(store.currentPage).toBe(0)
      expect(store.listLoading).toBe(false)
      expect(store.listError).toBeNull()
      expect(store.selectedParticipant).toBeNull()
      expect(store.detailLoading).toBe(false)
      expect(store.detailError).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('should compute isEmpty as false when participants are loaded', async () => {
      mockGetIssuersV4.mockResolvedValue(MOCK_PARTICIPANTS_RESPONSE)
      const store = useTirStore()

      await store.fetchParticipants()

      expect(store.isEmpty).toBe(false)
    })

    it('should compute isEmpty as false while loading', () => {
      const store = useTirStore()
      store.listLoading = true

      expect(store.isEmpty).toBe(false)
    })

    it('should compute totalPages correctly', async () => {
      mockGetIssuersV4.mockResolvedValue({
        ...MOCK_PARTICIPANTS_RESPONSE,
        total: 25,
      })
      const store = useTirStore()

      await store.fetchParticipants(0, 10)

      expect(store.totalPages).toBe(3)
    })
  })
})
