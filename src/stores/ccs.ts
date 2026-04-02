/**
 * Pinia store for Credentials Config Service (CCS) state management.
 *
 * Uses the CCS API for listing services (paginated) and fetching
 * individual service details by ID.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ServiceService, ApiError } from '@/api/generated/ccs'
import type { Service, Services } from '@/api/generated/ccs'

/** Default number of services per page. */
const DEFAULT_PAGE_SIZE = 10

export const useCcsStore = defineStore('ccs', () => {
  // ── List state ──────────────────────────────────────────────────────
  /** Array of services for the current page. */
  const services = ref<Service[]>([])
  /** Total number of services available across all pages. */
  const totalServices = ref(0)
  /** Number of services displayed per page. */
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  /** Current zero-based page index. */
  const currentPage = ref(0)
  /** Whether the list is currently being fetched. */
  const listLoading = ref(false)
  /** Error message from the last list fetch, or null if successful. */
  const listError = ref<string | null>(null)

  // ── Detail state ────────────────────────────────────────────────────
  /** The currently selected service for the detail view. */
  const selectedService = ref<Service | null>(null)
  /** Whether the detail is currently being fetched. */
  const detailLoading = ref(false)
  /** Error message from the last detail fetch, or null if successful. */
  const detailError = ref<string | null>(null)

  /** Whether the services list is empty (after a successful fetch). */
  const isEmpty = computed(() => !listLoading.value && services.value.length === 0)

  /** Total number of pages based on current page size. */
  const totalPages = computed(() => Math.max(1, Math.ceil(totalServices.value / pageSize.value)))

  /**
   * Fetch a page of services from the CCS API.
   *
   * @param page - Zero-based page index. Defaults to `currentPage`.
   * @param size - Number of items per page. Defaults to `pageSize`.
   */
  async function fetchServices(page?: number, size?: number): Promise<void> {
    const requestedPage = page ?? currentPage.value
    const requestedSize = size ?? pageSize.value

    listLoading.value = true
    listError.value = null

    try {
      const response: Services = await ServiceService.getServices({
        pageSize: requestedSize,
        page: requestedPage,
      })

      services.value = response.services ?? []
      totalServices.value = response.total ?? 0
      pageSize.value = requestedSize
      currentPage.value = requestedPage
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : String(error)
      services.value = []
      totalServices.value = 0
    } finally {
      listLoading.value = false
    }
  }

  /**
   * Fetch the full detail of a single service from the CCS API.
   *
   * @param id - The ID of the service to fetch.
   */
  async function fetchServiceDetail(id: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    selectedService.value = null

    try {
      selectedService.value = await ServiceService.getService({ id })
    } catch (error) {
      detailError.value = error instanceof ApiError ? error.message : String(error)
    } finally {
      detailLoading.value = false
    }
  }

  /** Reset the store to its initial state. */
  function $reset(): void {
    services.value = []
    totalServices.value = 0
    pageSize.value = DEFAULT_PAGE_SIZE
    currentPage.value = 0
    listLoading.value = false
    listError.value = null
    selectedService.value = null
    detailLoading.value = false
    detailError.value = null
  }

  return {
    // State
    services,
    totalServices,
    pageSize,
    currentPage,
    listLoading,
    listError,
    selectedService,
    detailLoading,
    detailError,
    // Computed
    isEmpty,
    totalPages,
    // Actions
    fetchServices,
    fetchServiceDetail,
    $reset,
  }
})
