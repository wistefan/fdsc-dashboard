<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('ccs.listTitle') }}
      </h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        :to="{ name: 'ccs-create' }"
      >
        {{ t('ccs.createTitle') }}
      </v-btn>
    </div>

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
          @click="store.fetchServices()"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Data table -->
    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="store.services"
        :items-length="store.totalServices"
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

        <!-- Scope count column -->
        <template #item.oidcScopes="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
          >
            {{ scopeCount(item) }}
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
              mdi-cog-off-outline
            </v-icon>
            <p class="text-h6 text-medium-emphasis">
              {{ t('ccs.noServices') }}
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
import { useCcsStore } from '@/stores/ccs'
import type { Service } from '@/api/generated/ccs'

const { t } = useI18n()
const router = useRouter()
const store = useCcsStore()

/** Column definitions for the services data table. */
const headers = computed(() => [
  { title: t('ccs.serviceId'), key: 'id', sortable: false },
  { title: t('ccs.defaultOidcScope'), key: 'defaultOidcScope', sortable: false },
  { title: t('ccs.oidcScopes'), key: 'oidcScopes', sortable: false, width: '120px' },
  {
    title: '',
    key: 'href',
    sortable: false,
    align: 'end' as const,
    width: '120px',
  },
])

/**
 * Count the number of OIDC scopes configured for a service.
 *
 * @param service - The service to count scopes for.
 * @returns The number of OIDC scopes.
 */
function scopeCount(service: Service): number {
  return service.oidcScopes ? Object.keys(service.oidcScopes).length : 0
}

/** Navigate to the detail view for a given service ID. */
function navigateToDetail(id: string): void {
  router.push({ name: 'ccs-detail', params: { id } })
}

/** Navigate to the detail view for the selected service (row click handler). */
function onRowClick(_event: Event, row: { item: Service }): void {
  navigateToDetail(row.item.id ?? '')
}

/** Handle page change from the data table. */
function onPageChange(page: number): void {
  store.fetchServices(page - 1)
}

/** Handle page size change from the data table. */
function onPageSizeChange(size: number): void {
  store.fetchServices(0, size)
}

onMounted(() => {
  store.fetchServices()
})
</script>
