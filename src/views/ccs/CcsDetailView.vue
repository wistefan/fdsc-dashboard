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
      to="/ccs"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('ccs.detailTitle') }}
      </h1>
      <v-spacer />
      <v-btn
        v-if="store.selectedService"
        color="primary"
        variant="tonal"
        class="mr-2"
        prepend-icon="mdi-pencil"
        :to="{ name: 'ccs-edit', params: { id } }"
      >
        {{ t('common.edit') }}
      </v-btn>
      <v-btn
        v-if="store.selectedService"
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
          {{ t('ccs.confirmDeleteService') }}
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
          @click="store.fetchServiceDetail(id)"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Detail content -->
    <template v-else-if="store.selectedService">
      <!-- Service ID card -->
      <v-card class="mb-4">
        <v-card-title>
          {{ t('ccs.serviceId') }}
        </v-card-title>
        <v-card-text>
          <code class="text-body-1">{{ store.selectedService.id }}</code>
        </v-card-text>
      </v-card>

      <!-- Default OIDC Scope card -->
      <v-card class="mb-4">
        <v-card-title>
          {{ t('ccs.defaultOidcScope') }}
        </v-card-title>
        <v-card-text>
          <v-chip
            variant="tonal"
            color="primary"
          >
            {{ store.selectedService.defaultOidcScope }}
          </v-chip>
        </v-card-text>
      </v-card>

      <!-- Authorization Type card (if present) -->
      <v-card
        v-if="store.selectedService.authorizationType"
        class="mb-4"
      >
        <v-card-title>
          {{ t('ccs.authorizationType') }}
        </v-card-title>
        <v-card-text>
          <v-chip
            variant="outlined"
          >
            {{ store.selectedService.authorizationType }}
          </v-chip>
        </v-card-text>
      </v-card>

      <!-- OIDC Scopes section -->
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-shield-key
          </v-icon>
          {{ t('ccs.oidcScopes') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ scopeCount }}
          </v-chip>
        </v-card-title>

        <v-card-text v-if="!hasScopes">
          <p class="text-medium-emphasis">
            {{ t('ccs.noScopes') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(entry, scopeName) in store.selectedService.oidcScopes"
            :key="String(scopeName)"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-key-variant
              </v-icon>
              <span class="font-weight-medium">
                {{ scopeName }}
              </span>
              <v-spacer />
              <v-chip
                size="x-small"
                variant="outlined"
                class="mr-2"
              >
                {{ entry.credentials?.length ?? 0 }} {{ t('til.credentials').toLowerCase() }}
              </v-chip>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Credentials for this scope -->
              <div
                v-for="(cred, ci) in entry.credentials"
                :key="ci"
                class="mb-3"
              >
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('til.credentialType') }}:
                </span>
                <span class="ml-2">{{ cred.type || '—' }}</span>
              </div>

              <!-- Flat claims flag -->
              <div
                v-if="entry.flatClaims !== undefined"
                class="mb-3"
              >
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('ccs.flatClaims') }}:
                </span>
                <v-chip
                  size="x-small"
                  :color="entry.flatClaims ? 'success' : 'default'"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ entry.flatClaims ? t('common.yes') : t('common.no') }}
                </v-chip>
              </div>

              <!-- DCQL section -->
              <template v-if="entry.dcql">
                <v-divider class="mb-3" />
                <div class="d-flex align-center mb-3">
                  <v-icon
                    start
                    size="small"
                    color="info"
                  >
                    mdi-file-document-check
                  </v-icon>
                  <span class="text-subtitle-2 font-weight-medium">
                    {{ t('ccs.dcql') }}
                  </span>
                </div>

                <!-- Credential Queries -->
                <div class="mb-3">
                  <span class="text-subtitle-2 text-medium-emphasis">
                    {{ t('ccs.credentialQueries') }}
                  </span>
                  <v-chip
                    class="ml-2"
                    size="x-small"
                    color="info"
                    variant="tonal"
                  >
                    {{ entry.dcql.credentials?.length ?? 0 }}
                  </v-chip>
                </div>

                <v-card
                  v-for="(cq, cqIdx) in entry.dcql.credentials"
                  :key="cqIdx"
                  variant="outlined"
                  class="mb-3 pa-3"
                >
                  <div
                    v-if="cq.id"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialQueryId') }}:</span>
                    <code class="ml-1">{{ cq.id }}</code>
                  </div>
                  <div
                    v-if="cq.format"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialQueryFormat') }}:</span>
                    <v-chip
                      size="x-small"
                      variant="outlined"
                      class="ml-1"
                    >
                      {{ cq.format }}
                    </v-chip>
                  </div>
                  <div
                    v-if="cq.multiple"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialQueryMultiple') }}:</span>
                    <v-chip
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="ml-1"
                    >
                      {{ t('common.yes') }}
                    </v-chip>
                  </div>
                  <div
                    v-if="cq.require_cryptographic_holder_binding === false"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.requireCryptographicHolderBinding') }}:</span>
                    <v-chip
                      size="x-small"
                      color="warning"
                      variant="tonal"
                      class="ml-1"
                    >
                      {{ t('common.no') }}
                    </v-chip>
                  </div>

                  <!-- Metadata -->
                  <div
                    v-if="cq.meta"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.metadata') }}:</span>
                    <code class="ml-1 text-caption">{{ JSON.stringify(cq.meta) }}</code>
                  </div>

                  <!-- Claims -->
                  <div
                    v-if="cq.claims && cq.claims.length > 0"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.claimsQueries') }}:</span>
                    <div
                      v-for="(claim, clIdx) in cq.claims"
                      :key="clIdx"
                      class="ml-4 mb-1"
                    >
                      <code class="text-caption">{{ JSON.stringify(claim) }}</code>
                    </div>
                  </div>

                  <!-- Trusted Authorities -->
                  <div
                    v-if="cq.trusted_authorities && cq.trusted_authorities.length > 0"
                    class="mb-1"
                  >
                    <span class="text-caption text-medium-emphasis">{{ t('ccs.trustedAuthorities') }}:</span>
                    <div
                      v-for="(ta, taIdx) in cq.trusted_authorities"
                      :key="taIdx"
                      class="ml-4 mb-1"
                    >
                      <v-chip
                        size="x-small"
                        variant="outlined"
                        class="mr-1"
                      >
                        {{ ta.type }}
                      </v-chip>
                      <span class="text-caption">{{ ta.values?.join(', ') }}</span>
                    </div>
                  </div>
                </v-card>

                <!-- Credential Set Queries -->
                <template v-if="entry.dcql.credential_sets && entry.dcql.credential_sets.length > 0">
                  <div class="mb-3">
                    <span class="text-subtitle-2 text-medium-emphasis">
                      {{ t('ccs.credentialSetQueries') }}
                    </span>
                    <v-chip
                      class="ml-2"
                      size="x-small"
                      color="info"
                      variant="tonal"
                    >
                      {{ entry.dcql.credential_sets.length }}
                    </v-chip>
                  </div>
                  <v-card
                    v-for="(csq, csqIdx) in entry.dcql.credential_sets"
                    :key="csqIdx"
                    variant="outlined"
                    class="mb-3 pa-3"
                  >
                    <div
                      v-if="csq.options"
                      class="mb-1"
                    >
                      <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialSetOptions') }}:</span>
                      <code class="ml-1 text-caption">{{ JSON.stringify(csq.options) }}</code>
                    </div>
                    <div
                      v-if="csq.required"
                      class="mb-1"
                    >
                      <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialSetRequired') }}:</span>
                      <v-chip
                        size="x-small"
                        color="success"
                        variant="tonal"
                        class="ml-1"
                      >
                        {{ t('common.yes') }}
                      </v-chip>
                    </div>
                    <div
                      v-if="csq.purpose"
                      class="mb-1"
                    >
                      <span class="text-caption text-medium-emphasis">{{ t('ccs.credentialSetPurpose') }}:</span>
                      <code class="ml-1 text-caption">{{ JSON.stringify(csq.purpose) }}</code>
                    </div>
                  </v-card>
                </template>
              </template>
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
import { useCcsStore } from '@/stores/ccs'

/** Timeout in milliseconds for snackbar messages. */
const SNACKBAR_TIMEOUT = 3000

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()
const store = useCcsStore()

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
 * Handle service deletion after confirmation.
 * Calls the store delete action and navigates back on success.
 */
async function handleDelete(): Promise<void> {
  const success = await store.deleteService(props.id)
  showDeleteDialog.value = false
  if (success) {
    successMessage.value = t('ccs.deleteSuccess')
    showSuccess.value = true
    router.push({ name: 'ccs-list' })
  } else {
    errorMessage.value = store.saveError ?? t('ccs.deleteError')
    showError.value = true
  }
}

/** Number of OIDC scopes configured for the selected service. */
const scopeCount = computed(() =>
  store.selectedService?.oidcScopes
    ? Object.keys(store.selectedService.oidcScopes).length
    : 0,
)

/** Whether the selected service has any OIDC scopes. */
const hasScopes = computed(() => scopeCount.value > 0)

onMounted(() => {
  store.fetchServiceDetail(props.id)
})
</script>
