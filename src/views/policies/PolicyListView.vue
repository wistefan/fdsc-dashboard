<template>
  <div>
    <h1 class="text-h4 mb-4">
      {{ t('policies.listTitle') }}
    </h1>

    <!-- Error alert -->
    <v-alert
      v-if="store.listError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="store.listError = null"
    >
      {{ store.listError }}
      <template #append>
        <v-btn
          variant="text"
          size="small"
          @click="store.fetchPolicies()"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Data table -->
    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="store.policies"
        :items-length="store.totalPolicies"
        :loading="store.listLoading"
        :items-per-page="store.pageSize"
        :page="store.currentPage + 1"
        item-value="id"
        hover
        class="cursor-pointer"
        @update:page="onPageChange"
        @update:items-per-page="onPageSizeChange"
        @click:row="onRowClick"
      >
        <!-- ID column -->
        <template #item.id="{ item }">
          <span class="text-body-2 font-weight-medium">
            {{ item.id }}
          </span>
        </template>

        <!-- ODRL UID column (dynamic slot name because key contains a colon) -->
        <template #[odrlUidSlot]="{ item }">
          <span class="text-body-2">
            {{ item['odrl:uid'] ?? '' }}
          </span>
        </template>

        <!-- Policy type column -->
        <template #item.policyType="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
          >
            {{ extractPolicyType(item) }}
          </v-chip>
        </template>

        <!-- Actions column -->
        <template #item.href="{ item }">
          <v-chip
            size="small"
            variant="outlined"
            color="primary"
            @click.stop="navigateToDetail(item.id ?? '')"
          >
            {{ t('common.details') }}
          </v-chip>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center pa-8">
            <v-icon
              size="64"
              color="grey-lighten-1"
              class="mb-4"
            >
              mdi-gavel
            </v-icon>
            <p class="text-h6 text-medium-emphasis">
              {{ t('policies.noPolicies') }}
            </p>
          </div>
        </template>

        <!-- Loading state -->
        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>
      </v-data-table-server>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePoliciesStore } from '@/stores/policies'
import type { Policy } from '@/api/generated/odrl'

/** Fallback value when the ODRL type cannot be determined. */
const UNKNOWN_TYPE = 'Unknown'

/** Dynamic slot name for the ODRL UID column (key contains a colon). */
const odrlUidSlot = 'item.odrl:uid'

const { t } = useI18n()
const router = useRouter()
const store = usePoliciesStore()

/** Column definitions for the policies data table. */
const headers = computed(() => [
  { title: t('policies.policyId'), key: 'id', sortable: false },
  { title: t('policies.odrlUid'), key: 'odrl:uid', sortable: false },
  { title: t('policies.policyType'), key: 'policyType', sortable: false, width: '140px' },
  {
    title: '',
    key: 'href',
    sortable: false,
    align: 'end' as const,
    width: '120px',
  },
])

/**
 * Extract the ODRL policy type from the policy's `odrl` JSON string.
 *
 * Parses the `odrl` field and reads the `@type` property.
 * Returns a fallback string if parsing fails or the field is absent.
 *
 * @param policy - The policy to extract the type from.
 * @returns The ODRL policy type (e.g. "Set", "Offer", "Agreement").
 */
function extractPolicyType(policy: Policy): string {
  if (!policy.odrl) {
    return UNKNOWN_TYPE
  }
  try {
    const parsed = JSON.parse(policy.odrl)
    return parsed['@type'] ?? UNKNOWN_TYPE
  } catch {
    return UNKNOWN_TYPE
  }
}

/** Navigate to the detail view for a given policy ID. */
function navigateToDetail(id: string): void {
  router.push({ name: 'policy-detail', params: { id } })
}

/** Navigate to the detail view for the selected policy (row click handler). */
function onRowClick(_event: Event, row: { item: Policy }): void {
  navigateToDetail(row.item.id ?? '')
}

/** Handle page change from the data table. */
function onPageChange(page: number): void {
  store.fetchPolicies(page - 1)
}

/** Handle page size change from the data table. */
function onPageSizeChange(size: number): void {
  store.fetchPolicies(0, size)
}

onMounted(() => {
  store.fetchPolicies()
})
</script>
