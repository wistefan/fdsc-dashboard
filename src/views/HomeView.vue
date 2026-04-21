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
