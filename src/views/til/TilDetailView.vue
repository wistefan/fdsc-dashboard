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
<template>
  <div>
    <!-- Back button -->
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      to="/til"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('til.detailTitle') }}
      </h1>
      <v-spacer />
      <v-btn
        v-if="store.selectedIssuer"
        color="primary"
        variant="tonal"
        class="mr-2"
        prepend-icon="mdi-pencil"
        :to="{ name: 'til-edit', params: { did } }"
      >
        {{ t('common.edit') }}
      </v-btn>
      <v-btn
        v-if="store.selectedIssuer"
        color="error"
        variant="tonal"
        prepend-icon="mdi-delete"
        :loading="store.saving"
        @click="showDeleteDialog = true"
      >
        {{ t('common.delete') }}
      </v-btn>
    </div>

    <!-- Delete confirmation dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title>{{ t('common.confirmDelete') }}</v-card-title>
        <v-card-text>
          {{ t('til.confirmDeleteIssuer') }}
          <br>
          <span class="text-medium-emphasis text-body-2">
            {{ t('common.deleteWarning') }}
          </span>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="store.saving"
            @click="handleDelete"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success snackbar -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      :timeout="SNACKBAR_TIMEOUT"
    >
      {{ successMessage }}
    </v-snackbar>

    <!-- Error snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      :timeout="SNACKBAR_TIMEOUT"
    >
      {{ errorMessage }}
    </v-snackbar>

    <!-- Loading state -->
    <template v-if="store.detailLoading">
      <v-skeleton-loader
        type="card"
        class="mb-4"
      />
      <v-skeleton-loader type="card" />
    </template>

    <!-- Error state -->
    <v-alert
      v-else-if="store.detailError"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ store.detailError }}
      <template #append>
        <v-btn
          variant="text"
          size="small"
          @click="store.fetchIssuerDetail(did)"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Detail content -->
    <template v-else-if="store.selectedIssuer">
      <!-- Issuer DID card -->
      <v-card class="mb-4">
        <v-card-title>
          {{ t('til.did') }}
        </v-card-title>
        <v-card-text>
          <code class="text-body-1">{{ store.selectedIssuer.did }}</code>
        </v-card-text>
      </v-card>

      <!-- Credentials section -->
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-file-certificate
          </v-icon>
          {{ t('til.credentials') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ credentialCount }}
          </v-chip>
        </v-card-title>

        <v-card-text v-if="!hasCredentials">
          <p class="text-medium-emphasis">
            {{ t('til.noCredentials') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(cred, index) in store.selectedIssuer.credentials"
            :key="index"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-key-variant
              </v-icon>
              <span class="font-weight-medium">
                {{ cred.credentialsType || t('til.credentialType') + ' ' + (index + 1) }}
              </span>
              <v-spacer />
              <v-chip
                v-if="cred.validFor"
                size="x-small"
                variant="outlined"
                class="mr-2"
              >
                {{ formatDateRange(cred.validFor) }}
              </v-chip>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Credential type -->
              <div class="mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('til.credentialType') }}:
                </span>
                <span class="ml-2">{{ cred.credentialsType || '—' }}</span>
              </div>

              <!-- Validity period -->
              <div
                v-if="cred.validFor"
                class="mb-3"
              >
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('til.validFrom') }}:
                </span>
                <span class="ml-2">{{ cred.validFor.from || '—' }}</span>
                <span class="mx-2">|</span>
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('til.validTo') }}:
                </span>
                <span class="ml-2">{{ cred.validFor.to || '—' }}</span>
              </div>

              <!-- Claims table -->
              <div v-if="cred.claims && cred.claims.length > 0">
                <span class="text-subtitle-2 text-medium-emphasis d-block mb-2">
                  {{ t('til.claims') }}
                </span>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>{{ t('til.claimName') }}</th>
                      <th>{{ t('til.claimPath') }}</th>
                      <th>{{ t('til.allowedValues') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(claim, ci) in cred.claims"
                      :key="ci"
                    >
                      <td>{{ claim.name || '—' }}</td>
                      <td>
                        <code>{{ claim.path || '—' }}</code>
                      </td>
                      <td>
                        <template v-if="claim.allowedValues && claim.allowedValues.length > 0">
                          <v-chip
                            v-for="(val, vi) in claim.allowedValues"
                            :key="vi"
                            size="x-small"
                            variant="tonal"
                            class="ma-1"
                          >
                            {{ formatAllowedValue(val) }}
                          </v-chip>
                        </template>
                        <span
                          v-else
                          class="text-medium-emphasis"
                        >—</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <p
                v-else
                class="text-medium-emphasis text-body-2 mt-2"
              >
                {{ t('til.claims') }}: {{ t('common.empty') }}
              </p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTilStore } from '@/stores/til'
import type { TimeRange } from '@/api/generated/til'

/** Timeout in milliseconds for snackbar messages. */
const SNACKBAR_TIMEOUT = 3000

const props = defineProps<{ did: string }>()
const { t } = useI18n()
const router = useRouter()
const store = useTilStore()

/** Whether the delete confirmation dialog is visible. */
const showDeleteDialog = ref(false)
/** Whether the success snackbar is visible. */
const showSuccess = ref(false)
/** Success message text. */
const successMessage = ref('')
/** Whether the error snackbar is visible. */
const showError = ref(false)
/** Error message text. */
const errorMessage = ref('')

/**
 * Handle issuer deletion after confirmation.
 * Calls the store delete action and navigates back on success.
 */
async function handleDelete(): Promise<void> {
  const success = await store.deleteIssuer(props.did)
  showDeleteDialog.value = false
  if (success) {
    successMessage.value = t('til.deleteSuccess')
    showSuccess.value = true
    router.push({ name: 'til-list' })
  } else {
    errorMessage.value = store.saveError ?? t('til.deleteError')
    showError.value = true
  }
}

/** Number of credentials configured for the selected issuer. */
const credentialCount = computed(() => store.selectedIssuer?.credentials?.length ?? 0)

/** Whether the selected issuer has any credentials. */
const hasCredentials = computed(() => credentialCount.value > 0)

/**
 * Format a time range as a human-readable string.
 *
 * @param range - The time range to format.
 * @returns A formatted date range string.
 */
function formatDateRange(range: TimeRange): string {
  const from = range.from ?? '…'
  const to = range.to ?? '…'
  return `${from} → ${to}`
}

/**
 * Format an allowed value for display. Objects are JSON-stringified,
 * primitives are converted to strings.
 *
 * @param value - The allowed value to format.
 * @returns A display string.
 */
function formatAllowedValue(value: Record<string, unknown>): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

onMounted(() => {
  store.fetchIssuerDetail(props.did)
})
</script>
