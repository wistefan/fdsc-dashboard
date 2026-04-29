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
 * Pinia store for the Trusted Issuers Registry (TIR) — read-only
 * "Participants List" state management.
 *
 * All data is fetched from the EBSI-compatible TIR API. No write
 * operations are exposed because the registry is not locally managed.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TirService } from '@/api/generated/tir'
import type { IssuersResponse, IssuerEntry, Issuer } from '@/api/generated/tir'
import { ApiError } from '@/api/generated/tir'

/** Default number of participants per page. */
const DEFAULT_PAGE_SIZE = 10

export const useTirStore = defineStore('tir', () => {
  // -- List state -------------------------------------------------------------
  const participants = ref<IssuerEntry[]>([])
  const totalParticipants = ref(0)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const currentPage = ref(0)
  const listLoading = ref(false)
  const listError = ref<string | null>(null)

  // -- Detail state -----------------------------------------------------------
  const selectedParticipant = ref<Issuer | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  /** Whether the participants list is empty (after a successful fetch). */
  const isEmpty = computed(() => !listLoading.value && participants.value.length === 0)

  /** Total number of pages based on current page size. */
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalParticipants.value / pageSize.value)),
  )

  /**
   * Fetch a page of participants from the TIR API.
   *
   * @param page - Zero-based page index. Defaults to `currentPage`.
   * @param size - Number of items per page. Defaults to `pageSize`.
   */
  async function fetchParticipants(page?: number, size?: number): Promise<void> {
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

      participants.value = response.items ?? []
      totalParticipants.value = response.total ?? 0
      pageSize.value = requestedSize
      currentPage.value = requestedPage
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : String(error)
      participants.value = []
      totalParticipants.value = 0
    } finally {
      listLoading.value = false
    }
  }

  /**
   * Fetch a single participant's details from the TIR API.
   *
   * @param did - The DID of the participant to fetch.
   */
  async function fetchParticipantDetail(did: string): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    selectedParticipant.value = null

    try {
      selectedParticipant.value = await TirService.getIssuerV4({ did })
    } catch (error) {
      detailError.value = error instanceof ApiError ? error.message : String(error)
    } finally {
      detailLoading.value = false
    }
  }

  /** Reset the store to its initial state. */
  function $reset(): void {
    participants.value = []
    totalParticipants.value = 0
    pageSize.value = DEFAULT_PAGE_SIZE
    currentPage.value = 0
    listLoading.value = false
    listError.value = null
    selectedParticipant.value = null
    detailLoading.value = false
    detailError.value = null
  }

  return {
    // State
    participants,
    totalParticipants,
    pageSize,
    currentPage,
    listLoading,
    listError,
    selectedParticipant,
    detailLoading,
    detailError,
    // Computed
    isEmpty,
    totalPages,
    // Actions
    fetchParticipants,
    fetchParticipantDetail,
    $reset,
  }
})
