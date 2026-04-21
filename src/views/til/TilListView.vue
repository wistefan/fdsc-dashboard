<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('til.listTitle') }}
      </h1>
      <v-spacer />
      <v-btn
        v-if="canEdit"
        color="primary"
        prepend-icon="mdi-plus"
        :to="{ name: 'til-create' }"
      >
        {{ t('til.createTitle') }}
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
          @click="store.fetchIssuers()"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Data table -->
    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="store.issuers"
        :items-length="store.totalIssuers"
        :loading="store.listLoading"
        :items-per-page="store.pageSize"
        :page="store.currentPage + 1"
        item-value="did"
        hover
        class="cursor-pointer"
        @update:page="onPageChange"
        @update:items-per-page="onPageSizeChange"
        @click:row="onRowClick"
      >
        <!-- DID column -->
        <template #item.did="{ item }">
          <span class="text-body-2 font-weight-medium">
            {{ item.did }}
          </span>
        </template>

        <!-- Actions column -->
        <template #item.href="{ item }">
          <v-chip
            size="small"
            variant="outlined"
            color="primary"
            @click.stop="navigateToDetail(item.did)"
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
              mdi-shield-off-outline
            </v-icon>
            <p class="text-h6 text-medium-emphasis">
              {{ t('til.noIssuers') }}
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
import { useTilStore } from '@/stores/til'
import { useAuth } from '@/composables/useAuth'
import type { IssuerEntry } from '@/api/generated/tir'

const { t } = useI18n()
const router = useRouter()
const store = useTilStore()

/** Role-based capability flags for the current user. */
const { canEdit } = useAuth()

/** Column definitions for the issuers data table. */
const headers = computed(() => [
  { title: t('til.did'), key: 'did', sortable: false },
  {
    title: '',
    key: 'href',
    sortable: false,
    align: 'end' as const,
    width: '120px',
  },
])

/** Navigate to the detail view for a given issuer DID. */
function navigateToDetail(did: string): void {
  router.push({ name: 'til-detail', params: { did } })
}

/** Navigate to the detail view for the selected issuer (row click handler). */
function onRowClick(_event: Event, row: { item: IssuerEntry }): void {
  navigateToDetail(row.item.did)
}

/** Handle page change from the data table. */
function onPageChange(page: number): void {
  store.fetchIssuers(page - 1)
}

/** Handle page size change from the data table. */
function onPageSizeChange(size: number): void {
  store.fetchIssuers(0, size)
}

onMounted(() => {
  store.fetchIssuers()
})
</script>
