<template>
  <div>
    <h1 class="text-h4 mb-2">
      {{ t('home.title') }}
    </h1>
    <p class="text-subtitle-1 text-medium-emphasis mb-6">
      {{ t('home.subtitle') }}
    </p>

    <v-row>
      <v-col
        cols="12"
        md="4"
      >
        <v-card
          to="/til"
          hover
        >
          <v-card-item>
            <v-icon
              size="48"
              color="primary"
              class="mb-2"
            >
              mdi-shield-check
            </v-icon>
            <v-card-title>{{ t('nav.til') }}</v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="4"
      >
        <v-card
          to="/ccs"
          hover
        >
          <v-card-item>
            <v-icon
              size="48"
              color="primary"
              class="mb-2"
            >
              mdi-file-certificate
            </v-icon>
            <v-card-title>{{ t('nav.ccs') }}</v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="4"
      >
        <v-card
          to="/policies"
          hover
        >
          <v-card-item>
            <v-icon
              size="48"
              color="primary"
              class="mb-2"
            >
              mdi-gavel
            </v-icon>
            <v-card-title>{{ t('nav.policies') }}</v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
