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
                  Flat Claims:
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
