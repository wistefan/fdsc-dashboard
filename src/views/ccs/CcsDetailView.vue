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

    <h1 class="text-h4 mb-4">
      {{ t('ccs.detailTitle') }}
    </h1>

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
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCcsStore } from '@/stores/ccs'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const store = useCcsStore()

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
