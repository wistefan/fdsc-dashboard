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
  <v-app>
    <!-- App bar with title and theme toggle -->
    <v-app-bar
      color="primary"
      density="default"
    >
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>{{ t('app.title') }}</v-app-bar-title>
      <v-spacer />
      <v-btn
        icon
        :aria-label="t('theme.toggle')"
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation drawer / sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      app
    >
      <v-list
        nav
        density="compact"
      >
        <v-list-item
          prepend-icon="mdi-home"
          :title="t('nav.home')"
          to="/"
        />
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-shield-check"
          :title="t('nav.til')"
          to="/til"
        />
        <v-list-item
          prepend-icon="mdi-file-certificate"
          :title="t('nav.ccs')"
          to="/ccs"
        />
        <v-list-item
          prepend-icon="mdi-gavel"
          :title="t('nav.policies')"
          to="/policies"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main content area -->
    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'

const { t } = useI18n()
const { isDark, toggleTheme, initTheme } = useTheme()
const { initLocale } = useLocale()

/** Controls the visibility of the navigation drawer. */
const drawer = ref(true)

onMounted(() => {
  initTheme()
  initLocale()
})
</script>
