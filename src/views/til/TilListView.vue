<template>
  <div>
    <h1 class="text-h4 mb-4">{{ t('nav.til') }}</h1>
    <v-card>
      <v-card-text class="text-medium-emphasis">
        {{ t('common.empty') }}
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
