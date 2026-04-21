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
      to="/policies"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <!-- Service badge -->
    <v-chip
      v-if="serviceId"
      class="mb-4 ml-2"
      color="info"
      variant="tonal"
      prepend-icon="mdi-folder-outline"
    >
      {{ t('policies.service') }}: {{ serviceId }}
    </v-chip>

    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('policies.detailTitle') }}
      </h1>
      <v-spacer />
      <v-btn
        v-if="store.selectedPolicy"
        color="primary"
        variant="tonal"
        class="mr-2"
        prepend-icon="mdi-pencil"
        :to="editRoute"
      >
        {{ t('common.edit') }}
      </v-btn>
      <v-btn
        v-if="store.selectedPolicy"
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
          {{ t('policies.confirmDeletePolicy') }}
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
          @click="store.fetchPolicyDetail(id)"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Detail content -->
    <template v-else-if="store.selectedPolicy">
      <!-- Policy ID card -->
      <v-card class="mb-4">
        <v-card-title>
          {{ t('policies.policyId') }}
        </v-card-title>
        <v-card-text>
          <code class="text-body-1">{{ store.selectedPolicy.id }}</code>
        </v-card-text>
      </v-card>

      <!-- ODRL UID card -->
      <v-card
        v-if="store.selectedPolicy['odrl:uid']"
        class="mb-4"
      >
        <v-card-title>
          {{ t('policies.odrlUid') }}
        </v-card-title>
        <v-card-text>
          <code class="text-body-1">{{ store.selectedPolicy['odrl:uid'] }}</code>
        </v-card-text>
      </v-card>

      <!-- ODRL Policy section with structured display -->
      <v-card
        v-if="parsedOdrl"
        class="mb-4"
      >
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-code-json
          </v-icon>
          {{ t('policies.odrlPolicy') }}
          <v-chip
            v-if="odrlType"
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ odrlType }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <!-- Permissions display -->
          <template v-if="odrlPermissions.length > 0">
            <div class="text-subtitle-2 text-medium-emphasis mb-2">
              {{ t('policies.permissions') }}
            </div>
            <v-card
              v-for="(perm, permIdx) in odrlPermissions"
              :key="permIdx"
              variant="outlined"
              class="mb-3 pa-3"
            >
              <div class="mb-2">
                <span class="text-caption text-medium-emphasis">{{ t('policies.target') }}:</span>
                <v-chip
                  size="small"
                  variant="tonal"
                  color="info"
                  class="ml-2"
                >
                  {{ perm.target }}
                </v-chip>
              </div>
              <div class="mb-2">
                <span class="text-caption text-medium-emphasis">{{ t('policies.action') }}:</span>
                <v-chip
                  size="small"
                  variant="tonal"
                  color="success"
                  class="ml-2"
                >
                  {{ perm.action }}
                </v-chip>
              </div>
              <template v-if="perm.constraint && perm.constraint.length > 0">
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ t('policies.constraints') }}:
                </div>
                <div
                  v-for="(con, conIdx) in perm.constraint"
                  :key="conIdx"
                  class="ml-4 mb-1 d-flex align-center ga-1"
                >
                  <v-chip
                    size="small"
                    variant="outlined"
                  >
                    {{ con.leftOperand }}
                  </v-chip>
                  <v-chip
                    size="small"
                    variant="tonal"
                    color="warning"
                  >
                    {{ con.operator }}
                  </v-chip>
                  <v-chip
                    size="small"
                    variant="outlined"
                  >
                    {{ con.rightOperand }}
                  </v-chip>
                </div>
              </template>
            </v-card>
          </template>

          <!-- Raw ODRL JSON fallback -->
          <div class="text-subtitle-2 text-medium-emphasis mt-3 mb-2">
            {{ t('policies.rawJson') }}
          </div>
          <pre class="text-body-2 pa-3 bg-grey-lighten-4 rounded overflow-x-auto">{{ formattedOdrl }}</pre>
        </v-card-text>
      </v-card>

      <!-- Rego Code card -->
      <v-card
        v-if="store.selectedPolicy.rego"
        class="mb-4"
      >
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-file-code
          </v-icon>
          {{ t('policies.regoCode') }}
        </v-card-title>
        <v-card-text>
          <pre class="text-body-2 pa-3 bg-grey-lighten-4 rounded overflow-x-auto"><code>{{ store.selectedPolicy.rego }}</code></pre>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePoliciesStore } from '@/stores/policies'

/** Timeout in milliseconds for snackbar messages. */
const SNACKBAR_TIMEOUT = 3000

/** Number of spaces used for JSON indentation. */
const JSON_INDENT = 2

const props = defineProps<{ id: string; serviceId?: string }>()
const { t } = useI18n()
const router = useRouter()
const store = usePoliciesStore()

/** Whether this detail view is for a service-scoped policy. */
const isServicePolicy = computed(() => !!props.serviceId)

/** Route object for the edit button, accounting for service scope. */
const editRoute = computed(() => {
  if (isServicePolicy.value) {
    return { name: 'service-policy-edit', params: { serviceId: props.serviceId, id: props.id } }
  }
  return { name: 'policy-edit', params: { id: props.id } }
})

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
 * Handle policy deletion after confirmation.
 * Calls the store delete action and navigates back on success.
 */
/**
 * Handle policy deletion after confirmation.
 * Uses service-scoped or global delete based on whether serviceId is set.
 */
async function handleDelete(): Promise<void> {
  const success = isServicePolicy.value
    ? await store.deleteServicePolicy(props.serviceId!, props.id)
    : await store.deletePolicy(props.id)
  showDeleteDialog.value = false
  if (success) {
    successMessage.value = t('policies.deleteSuccess')
    showSuccess.value = true
    router.push({ name: 'policies-list' })
  } else {
    errorMessage.value = store.saveError ?? t('policies.deleteError')
    showError.value = true
  }
}

/**
 * Parse the ODRL JSON string from the selected policy.
 *
 * Returns the parsed object, or null if the field is absent or invalid.
 */
const parsedOdrl = computed(() => {
  if (!store.selectedPolicy?.odrl) {
    return null
  }
  try {
    return JSON.parse(store.selectedPolicy.odrl)
  } catch {
    return null
  }
})

/** The ODRL @type extracted from the parsed ODRL JSON (e.g. "Set", "Offer"). */
const odrlType = computed(() => parsedOdrl.value?.['@type'] ?? null)

/** ODRL permissions extracted from the parsed JSON. */
const odrlPermissions = computed(() => {
  if (!parsedOdrl.value?.permission) return []
  return Array.isArray(parsedOdrl.value.permission) ? parsedOdrl.value.permission : []
})

/** Pretty-printed ODRL JSON for display. */
const formattedOdrl = computed(() => {
  if (!parsedOdrl.value) {
    return store.selectedPolicy?.odrl ?? ''
  }
  return JSON.stringify(parsedOdrl.value, null, JSON_INDENT)
})

onMounted(() => {
  if (isServicePolicy.value) {
    store.fetchServicePolicyDetail(props.serviceId!, props.id)
  } else {
    store.fetchPolicyDetail(props.id)
  }
})
</script>
