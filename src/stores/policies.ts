/**
 * Pinia store for ODRL Policies state management.
 *
 * Uses the ODRL Policy API for listing policies (paginated), fetching
 * individual policy details by ID, and performing CRUD operations.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PolicyService, ApiError } from '@/api/generated/odrl'
import type { Policy, PolicyList, OdrlPolicyJson } from '@/api/generated/odrl'

/** Default number of policies per page. */
const DEFAULT_PAGE_SIZE = 10

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
    // Computed
    isEmpty,
    totalPages,
    // Actions
    fetchPolicies,
    fetchPolicyDetail,
    createPolicy,
    updatePolicy,
    deletePolicy,
    $reset,
  }
})
