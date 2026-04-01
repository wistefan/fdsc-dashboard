<template>
  <div>
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      to="/policies"
      class="mb-4"
    >
      {{ t('common.back') }}
    </v-btn>
    <h1 class="text-h4 mb-4">
      {{ t('common.details') }}
    </h1>
    <v-card>
      <v-card-text class="text-medium-emphasis">
        {{ t('common.empty') }}
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ id: string }>()
const { t } = useI18n()
</script>
