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
 * Pinia store for Trusted Issuers List (TIL) state management.
 *
 * Uses the TIR (EBSI-compatible) API for listing issuers (since the TIL
 * management API has no list endpoint) and the TIL management API for
 * fetching issuer details by DID.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TirService } from '@/api/generated/tir'
import { IssuerService } from '@/api/generated/til'
import type { IssuersResponse, IssuerEntry } from '@/api/generated/tir'
import type { TrustedIssuer } from '@/api/generated/til'
import { ApiError } from '@/api/generated/tir'

/** Default number of issuers per page. */
const DEFAULT_PAGE_SIZE = 10

export const useTilStore = defineStore('til', () => {
  // ── List state ──────────────────────────────────────────────────────
  const issuers = ref<IssuerEntry[]>([])
  const totalIssuers = ref(0)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const currentPage = ref(0)
  const listLoading = ref(false)
  const listError = ref<string | null>(null)

  // ── Detail state ────────────────────────────────────────────────────
  const selectedIssuer = ref<TrustedIssuer | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  /** Whether the issuers list is empty (after a successful fetch). */
  const isEmpty = computed(() => !listLoading.value && issuers.value.length === 0)

  /** Total number of pages based on current page size. */
  const totalPages = computed(() => Math.max(1, Math.ceil(totalIssuers.value / pageSize.value)))

  /**
   * Fetch a page of issuers from the TIR API.
   *
   * @param page - Zero-based page index. Defaults to `currentPage`.
   * @param size - Number of items per page. Defaults to `pageSize`.
   */
  async function fetchIssuers(page?: number, size?: number): Promise<void> {
    const requestedPage = page ?? currentPage.value
    const requestedSize = size ?? pageSize.value

    listLoading.value = true
    listError.value = null

    try {
      const pageAfter = requestedPage > 0 ? requestedPage * requestedSize : undefined
      const response: IssuersResponse = await TirService.getIssuersV4({
        pageSize: requestedSize,
        pageAfter,
      })

      issuers.value = response.items ?? []
      totalIssuers.value = response.total ?? 0
      pageSize.value = requestedSize
      currentPage.value = requestedPage
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : String(error)
      issuers.value = []
      totalIssuers.value = 0
    } finally {
      listLoading.value = false
    }
  }

  /**
   * Fetch the full detail of a single issuer from the TIL management API.
   *
   * @param did - The DID of the issuer to fetch.
   */
  async function fetchIssuerDetail(did: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    selectedIssuer.value = null

    try {
      selectedIssuer.value = await IssuerService.getIssuer({ did })
    } catch (error) {
      detailError.value = error instanceof ApiError ? error.message : String(error)
    } finally {
      detailLoading.value = false
    }
  }

  /** Reset the store to its initial state. */
  function $reset(): void {
    issuers.value = []
    totalIssuers.value = 0
    pageSize.value = DEFAULT_PAGE_SIZE
    currentPage.value = 0
    listLoading.value = false
    listError.value = null
    selectedIssuer.value = null
    detailLoading.value = false
    detailError.value = null
  }

  return {
    // State
    issuers,
    totalIssuers,
    pageSize,
    currentPage,
    listLoading,
    listError,
    selectedIssuer,
    detailLoading,
    detailError,
    // Computed
    isEmpty,
    totalPages,
    // Actions
    fetchIssuers,
    fetchIssuerDetail,
    $reset,
  }
})
