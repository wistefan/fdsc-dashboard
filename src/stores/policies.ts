/**
 * Pinia store for ODRL Policies state management.
 *
 * Uses the ODRL Policy API for listing policies (paginated), fetching
 * individual policy details by ID, and performing CRUD operations.
 * Also supports grouping policies under services via the Service API.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PolicyService, ServiceService, ApiError } from '@/api/generated/odrl'
import type { Policy, PolicyList, OdrlPolicyJson } from '@/api/generated/odrl'

/** Default number of policies per page. */
const DEFAULT_PAGE_SIZE = 10

/** Type for service list entries returned by the API. */
interface ServiceEntry {
  id?: string
  policyPath?: string
}

export const usePoliciesStore = defineStore('policies', () => {
  // ── List state ──────────────────────────────────────────────────────
  /** Array of policies for the current page. */
  const policies = ref<Policy[]>([])
  /** Total number of policies available across all pages. */
  const totalPolicies = ref(0)
  /** Number of policies displayed per page. */
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  /** Current zero-based page index. */
  const currentPage = ref(0)
  /** Whether the list is currently being fetched. */
  const listLoading = ref(false)
  /** Error message from the last list fetch, or null if successful. */
  const listError = ref<string | null>(null)

  // ── Detail state ────────────────────────────────────────────────────
  /** The currently selected policy for the detail view. */
  const selectedPolicy = ref<Policy | null>(null)
  /** Whether the detail is currently being fetched. */
  const detailLoading = ref(false)
  /** Error message from the last detail fetch, or null if successful. */
  const detailError = ref<string | null>(null)

  // ── CRUD state ──────────────────────────────────────────────────────
  /** Whether a create/update/delete operation is in progress. */
  const saving = ref(false)
  /** Error message from the last create/update/delete operation. */
  const saveError = ref<string | null>(null)

  // ── Service state ───────────────────────────────────────────────────
  /** Array of services for grouping policies. */
  const services = ref<ServiceEntry[]>([])
  /** Whether the service list is currently being fetched. */
  const servicesLoading = ref(false)
  /** Error message from the last service operation. */
  const serviceError = ref<string | null>(null)
  /** Whether a service create/delete operation is in progress. */
  const savingService = ref(false)

  /** Whether the policies list is empty (after a successful fetch). */
  const isEmpty = computed(() => !listLoading.value && policies.value.length === 0)

  /** Total number of pages based on current page size. */
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalPolicies.value / pageSize.value)),
  )

  /**
   * Fetch a page of policies from the ODRL Policy API.
   *
   * The API returns a flat array (`PolicyList = Array<Policy>`) without
   * pagination metadata. We use the array length to estimate the total:
   * if a full page is returned, there may be more; otherwise, we know the
   * exact count based on the current page offset plus items returned.
   *
   * @param page - Zero-based page index. Defaults to `currentPage`.
   * @param size - Number of items per page. Defaults to `pageSize`.
   */
  async function fetchPolicies(page?: number, size?: number): Promise<void> {
    const requestedPage = page ?? currentPage.value
    const requestedSize = size ?? pageSize.value

    listLoading.value = true
    listError.value = null

    try {
      const response: PolicyList = await PolicyService.getPolicies({
        pageSize: requestedSize,
        page: requestedPage,
      })

      const items = response ?? []
      policies.value = items

      // The API returns a flat array without a total count.
      // Estimate total: if a full page was returned, assume at least one more page.
      if (items.length >= requestedSize) {
        totalPolicies.value = (requestedPage + 2) * requestedSize
      } else {
        totalPolicies.value = requestedPage * requestedSize + items.length
      }

      pageSize.value = requestedSize
      currentPage.value = requestedPage
    } catch (error) {
      listError.value =
        error instanceof ApiError ? error.message : String(error)
      policies.value = []
      totalPolicies.value = 0
    } finally {
      listLoading.value = false
    }
  }

  /**
   * Fetch the full detail of a single policy from the ODRL Policy API.
   *
   * @param id - The ID of the policy to fetch.
   */
  async function fetchPolicyDetail(id: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    selectedPolicy.value = null

    try {
      selectedPolicy.value = await PolicyService.getPolicyById({ id })
    } catch (error) {
      detailError.value =
        error instanceof ApiError ? error.message : String(error)
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Create a new policy from an ODRL JSON object.
   *
   * @param policy - The ODRL policy JSON payload to create.
   * @returns `true` on success, `false` on error.
   */
  async function createPolicy(policy: OdrlPolicyJson): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await PolicyService.createPolicy({ requestBody: policy })
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing policy by ID using the PUT endpoint.
   *
   * @param id - The ID of the policy to update.
   * @param policy - The updated ODRL policy JSON payload.
   * @returns `true` on success, `false` on error.
   */
  async function updatePolicy(id: string, policy: OdrlPolicyJson): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await PolicyService.createPolicyWithId({ id, requestBody: policy })
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a policy by ID.
   *
   * @param id - The ID of the policy to delete.
   * @returns `true` on success, `false` on error.
   */
  async function deletePolicy(id: string): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await PolicyService.deletePolicyById({ id })
      selectedPolicy.value = null
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  // ── Service actions ─────────────────────────────────────────────────

  /**
   * Fetch the list of all services from the Service API.
   */
  async function fetchServices(): Promise<void> {
    servicesLoading.value = true
    serviceError.value = null

    try {
      const response = await ServiceService.getServices({})
      services.value = response ?? []
    } catch (error) {
      serviceError.value =
        error instanceof ApiError ? error.message : String(error)
      services.value = []
    } finally {
      servicesLoading.value = false
    }
  }

  /**
   * Create a new service for grouping policies.
   *
   * @param id - The ID for the new service.
   * @returns `true` on success, `false` on error.
   */
  async function createService(id: string): Promise<boolean> {
    savingService.value = true
    serviceError.value = null

    try {
      await ServiceService.createService({ requestBody: { id } })
      return true
    } catch (error) {
      serviceError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      savingService.value = false
    }
  }

  /**
   * Delete a service and all its grouped policies.
   *
   * @param serviceId - The ID of the service to delete.
   * @returns `true` on success, `false` on error.
   */
  async function deleteService(serviceId: string): Promise<boolean> {
    savingService.value = true
    serviceError.value = null

    try {
      await ServiceService.deleteService({ serviceId })
      return true
    } catch (error) {
      serviceError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      savingService.value = false
    }
  }

  /**
   * Fetch policies for a specific service.
   *
   * @param serviceId - The ID of the service.
   * @param page - Zero-based page index.
   * @param size - Number of items per page.
   * @returns The array of policies for the service.
   */
  async function fetchServicePolicies(
    serviceId: string,
    page = 0,
    size?: number,
  ): Promise<Policy[]> {
    const requestedSize = size ?? pageSize.value

    try {
      const response = await ServiceService.getServicePolicies({
        serviceId,
        page,
        pageSize: requestedSize,
      })
      return response ?? []
    } catch (error) {
      serviceError.value =
        error instanceof ApiError ? error.message : String(error)
      return []
    }
  }

  /**
   * Fetch a single policy detail from a service.
   *
   * @param serviceId - The service the policy belongs to.
   * @param policyId - The ID of the policy to fetch.
   */
  async function fetchServicePolicyDetail(serviceId: string, policyId: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    selectedPolicy.value = null

    try {
      selectedPolicy.value = await ServiceService.getServicePolicyById({
        serviceId,
        id: policyId,
      })
    } catch (error) {
      detailError.value =
        error instanceof ApiError ? error.message : String(error)
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Create a new policy under a specific service.
   *
   * @param serviceId - The service to create the policy under.
   * @param policy - The ODRL policy JSON payload.
   * @returns `true` on success, `false` on error.
   */
  async function createServicePolicy(serviceId: string, policy: OdrlPolicyJson): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await ServiceService.createServicePolicy({ serviceId, requestBody: policy })
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing policy under a specific service.
   *
   * @param serviceId - The service the policy belongs to.
   * @param policyId - The ID of the policy to update.
   * @param policy - The updated ODRL policy JSON payload.
   * @returns `true` on success, `false` on error.
   */
  async function updateServicePolicy(
    serviceId: string,
    policyId: string,
    policy: OdrlPolicyJson,
  ): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await ServiceService.createServicePolicyWithId({
        serviceId,
        id: policyId,
        requestBody: policy,
      })
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a policy under a specific service.
   *
   * @param serviceId - The service the policy belongs to.
   * @param policyId - The ID of the policy to delete.
   * @returns `true` on success, `false` on error.
   */
  async function deleteServicePolicy(serviceId: string, policyId: string): Promise<boolean> {
    saving.value = true
    saveError.value = null

    try {
      await ServiceService.deleteServicePolicyById({ serviceId, id: policyId })
      selectedPolicy.value = null
      return true
    } catch (error) {
      saveError.value =
        error instanceof ApiError ? error.message : String(error)
      return false
    } finally {
      saving.value = false
    }
  }

  /** Reset the store to its initial state. */
  function $reset(): void {
    policies.value = []
    totalPolicies.value = 0
    pageSize.value = DEFAULT_PAGE_SIZE
    currentPage.value = 0
    listLoading.value = false
    listError.value = null
    selectedPolicy.value = null
    detailLoading.value = false
    detailError.value = null
    saving.value = false
    saveError.value = null
    services.value = []
    servicesLoading.value = false
    serviceError.value = null
    savingService.value = false
  }

  return {
    // State
    policies,
    totalPolicies,
    pageSize,
    currentPage,
    listLoading,
    listError,
    selectedPolicy,
    detailLoading,
    detailError,
    saving,
    saveError,
    services,
    servicesLoading,
    serviceError,
    savingService,
    // Computed
    isEmpty,
    totalPages,
    // Actions
    fetchPolicies,
    fetchPolicyDetail,
    createPolicy,
    updatePolicy,
    deletePolicy,
    fetchServices,
    createService,
    deleteService,
    fetchServicePolicies,
    fetchServicePolicyDetail,
    createServicePolicy,
    updateServicePolicy,
    deleteServicePolicy,
    $reset,
  }
})
