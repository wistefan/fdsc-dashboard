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
      to="/tir"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>

    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">
        {{ t('tir.detailTitle') }}
      </h1>
    </div>

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
          @click="store.fetchParticipantDetail(did)"
        >
          {{ t('common.refresh') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Detail content -->
    <template v-else-if="store.selectedParticipant">
      <!-- Participant DID card -->
      <v-card class="mb-4">
        <v-card-title>
          {{ t('tir.did') }}
        </v-card-title>
        <v-card-text>
          <code class="text-body-1">{{ store.selectedParticipant.did }}</code>
        </v-card-text>
      </v-card>

      <!-- Attributes section -->
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>
            mdi-tag-multiple
          </v-icon>
          {{ t('tir.attributes') }}
          <v-chip
            class="ml-2"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ attributeCount }}
          </v-chip>
        </v-card-title>

        <v-card-text v-if="!hasAttributes">
          <p class="text-medium-emphasis">
            {{ t('tir.noAttributes') }}
          </p>
        </v-card-text>

        <v-expansion-panels
          v-else
          variant="accordion"
          class="mx-4 mb-4"
        >
          <v-expansion-panel
            v-for="(attr, index) in store.selectedParticipant.attributes"
            :key="index"
          >
            <v-expansion-panel-title>
              <v-icon
                start
                size="small"
              >
                mdi-tag
              </v-icon>
              <span class="font-weight-medium">
                {{ t('tir.attribute') }} {{ index + 1 }}
              </span>
              <v-spacer />
              <v-chip
                size="x-small"
                variant="outlined"
                class="mr-2"
              >
                {{ attr.issuerType }}
              </v-chip>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- Issuer type -->
              <div class="mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('tir.issuerType') }}:
                </span>
                <v-chip
                  class="ml-2"
                  size="small"
                  :color="issuerTypeColor(attr.issuerType)"
                  variant="tonal"
                >
                  {{ attr.issuerType }}
                </v-chip>
              </div>

              <!-- Hash -->
              <div class="mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('tir.hash') }}:
                </span>
                <code class="ml-2 text-body-2">{{ attr.hash }}</code>
              </div>

              <!-- TAO -->
              <div
                v-if="attr.tao"
                class="mb-3"
              >
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('tir.tao') }}:
                </span>
                <code class="ml-2 text-body-2">{{ attr.tao }}</code>
              </div>

              <!-- Root TAO -->
              <div
                v-if="attr.rootTao"
                class="mb-3"
              >
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('tir.rootTao') }}:
                </span>
                <code class="ml-2 text-body-2">{{ attr.rootTao }}</code>
              </div>

              <!-- Body (base64 content) -->
              <div class="mb-3">
                <span class="text-subtitle-2 text-medium-emphasis">
                  {{ t('tir.body') }}:
                </span>
                <v-sheet
                  class="mt-1 pa-3 text-body-2 overflow-x-auto"
                  color="grey-lighten-4"
                  rounded
                >
                  <code style="white-space: pre-wrap; word-break: break-all;">{{ attr.body }}</code>
                </v-sheet>
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
import { useTirStore } from '@/stores/tir'

const props = defineProps<{ did: string }>()
const { t } = useI18n()
const store = useTirStore()

/** Number of attributes for the selected participant. */
const attributeCount = computed(() => store.selectedParticipant?.attributes?.length ?? 0)

/** Whether the selected participant has any attributes. */
const hasAttributes = computed(() => attributeCount.value > 0)

/**
 * Map issuer type to a Vuetify color for visual distinction.
 *
 * @param issuerType - The issuer type string.
 * @returns A Vuetify color name.
 */
function issuerTypeColor(issuerType: string): string {
  const colorMap: Record<string, string> = {
    RootTAO: 'deep-purple',
    TAO: 'indigo',
    TI: 'teal',
    Revoked: 'error',
    Undefined: 'grey',
  }
  return colorMap[issuerType] ?? 'grey'
}

onMounted(() => {
  store.fetchParticipantDetail(props.did)
})
</script>
