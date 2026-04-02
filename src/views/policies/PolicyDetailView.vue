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

    <h1 class="text-h4 mb-4">
      {{ t('policies.detailTitle') }}
    </h1>

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

      <!-- ODRL Policy JSON card -->
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
          <pre class="text-body-2 pa-3 bg-grey-lighten-4 rounded overflow-x-auto">{{ store.selectedPolicy.rego }}</pre>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePoliciesStore } from '@/stores/policies'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const store = usePoliciesStore()

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

/** Pretty-printed ODRL JSON for display. */
const formattedOdrl = computed(() => {
  if (!parsedOdrl.value) {
    return store.selectedPolicy?.odrl ?? ''
  }
  /** Number of spaces used for JSON indentation. */
  const JSON_INDENT = 2
  return JSON.stringify(parsedOdrl.value, null, JSON_INDENT)
})

onMounted(() => {
  store.fetchPolicyDetail(props.id)
})
</script>
