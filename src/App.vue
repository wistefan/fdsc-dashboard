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
    <!-- App bar with title, theme toggle, and user menu -->
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

      <!-- Authenticated user menu. Hidden when auth is disabled so the
           default unauthenticated-by-default deployment is unchanged. -->
      <v-menu
        v-if="isAuthEnabled && isAuthenticated && user"
        offset="8"
      >
        <template #activator="{ props: activatorProps }">
          <v-btn
            v-bind="activatorProps"
            icon
            :aria-label="t('auth.userMenu')"
            class="user-menu-activator"
          >
            <v-icon>mdi-account-circle</v-icon>
          </v-btn>
        </template>
        <v-list
          density="comfortable"
          min-width="240"
        >
          <!-- User identity header -->
          <v-list-item
            :title="user.name"
            :subtitle="t('auth.signedInAs')"
            class="user-menu-identity"
          >
            <template #prepend>
              <v-icon size="32">
                mdi-account
              </v-icon>
            </template>
          </v-list-item>

          <v-divider />

          <!-- Role row -->
          <v-list-item :title="t('auth.role')">
            <template #append>
              <v-chip
                :color="user.role === ROLE_ADMIN ? 'primary' : 'secondary'"
                size="small"
                variant="tonal"
                class="user-menu-role-chip"
              >
                {{ roleLabel }}
              </v-chip>
            </template>
          </v-list-item>

          <!-- Provider row -->
          <v-list-item
            v-if="activeProviderDisplayName"
            :title="t('auth.provider')"
            :subtitle="activeProviderDisplayName"
          />

          <v-divider />

          <!-- Sign-out action -->
          <v-list-item
            :disabled="isSigningOut"
            :title="isSigningOut ? t('auth.signingOut') : t('auth.signOut')"
            class="user-menu-signout"
            @click="handleSignOut"
          >
            <template #prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'
import { useAuthStore } from '@/stores/auth'
import { ROLE_ADMIN, ROLE_VIEWER } from '@/auth/constants'

const { t } = useI18n()
const { isDark, toggleTheme, initTheme } = useTheme()
const { initLocale } = useLocale()
const authStore = useAuthStore()

/**
 * Reactive auth state exposed to the template.
 *
 * We wrap the Pinia-store getters in plain `computed` refs rather than
 * using `storeToRefs` so this component stays easy to mount in unit
 * tests where the store is mocked (mocks are not real Pinia instances,
 * and `storeToRefs` rejects them).
 */
const user = computed(() => authStore.user)
const activeProviderId = computed(() => authStore.activeProviderId)
const providers = computed(() => authStore.providers)
const isAuthEnabled = computed(() => authStore.isAuthEnabled)
const isAuthenticated = computed(() => authStore.isAuthenticated)

/** Controls the visibility of the navigation drawer. */
const drawer = ref(true)

/**
 * Whether a sign-out redirect is currently being negotiated. Used to disable
 * the menu item so the user cannot click it multiple times while the browser
 * is navigating to the provider's end-session endpoint.
 */
const isSigningOut = ref(false)

/**
 * Display name of the provider that issued the active session, resolved
 * from the configured provider list. Falls back to the raw provider id
 * when no matching provider is found (should not happen in practice).
 */
const activeProviderDisplayName = computed<string | null>(() => {
  const id = activeProviderId.value
  if (id === null) {
    return null
  }
  const match = providers.value.find((p) => p.id === id)
  return match?.displayName ?? id
})

/**
 * Human-readable label for the current user's canonical role, so the
 * user menu can present "Administrator" / "Viewer" without leaking the
 * internal role identifier.
 */
const roleLabel = computed<string>(() => {
  if (user.value?.role === ROLE_ADMIN) {
    return t('auth.roleAdmin')
  }
  if (user.value?.role === ROLE_VIEWER) {
    return t('auth.roleViewer')
  }
  return ''
})

/**
 * Terminate the active session via the auth store. Any failure is already
 * captured on `authStore.error` and surfaced through the standard UI; the
 * menu item simply re-enables so the user can retry.
 */
async function handleSignOut(): Promise<void> {
  if (isSigningOut.value) {
    return
  }
  isSigningOut.value = true
  try {
    await authStore.logout()
  } catch (err) {
    // The store has already recorded the error; just log for diagnostics.
    console.warn('[auth] Logout failed:', err)
  } finally {
    isSigningOut.value = false
  }
}

onMounted(() => {
  initTheme()
  initLocale()
  // Restore any cached OIDC session so the router guard sees the user
  // as authenticated on first paint. A failing restore is logged and
  // treated as "not signed in" — the guard will redirect to /login.
  void authStore.init().catch((err) => {
    console.warn('[auth] Failed to restore session:', err)
  })
})
</script>
