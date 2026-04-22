<template>
  <v-app>
    <!-- App bar with title, auth-token button and theme toggle -->
    <v-app-bar
      color="primary"
      density="default"
    >
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>{{ t('app.title') }}</v-app-bar-title>
      <v-spacer />
      <v-btn
        icon
        :aria-label="t('auth.toggle')"
        @click="openAuthDialog"
      >
        <v-icon>{{ isAuthenticated ? 'mdi-shield-lock' : 'mdi-shield-lock-open-outline' }}</v-icon>
      </v-btn>
      <v-btn
        icon
        :aria-label="t('theme.toggle')"
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Authentication token dialog -->
    <v-dialog
      v-model="showAuthDialog"
      max-width="600"
    >
      <v-card>
        <v-card-title>{{ t('auth.dialogTitle') }}</v-card-title>
        <v-card-subtitle>
          {{ isAuthenticated ? t('auth.statusAuthenticated') : t('auth.statusUnauthenticated') }}
        </v-card-subtitle>
        <v-card-text>
          <v-textarea
            v-model="tokenInput"
            :label="t('auth.tokenLabel')"
            :hint="t('auth.tokenHelp')"
            persistent-hint
            rows="4"
            auto-grow
            class="font-monospace"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showAuthDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            :disabled="!isAuthenticated"
            @click="handleClearToken"
          >
            {{ t('auth.clear') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="handleSaveToken"
          >
            {{ t('auth.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { useAuth } from '@/composables/useAuth'

const { t } = useI18n()
const { isDark, toggleTheme, initTheme } = useTheme()
const { initLocale } = useLocale()
const { token, isAuthenticated, setToken, clearToken, initAuth } = useAuth()

/** Controls the visibility of the navigation drawer. */
const drawer = ref(true)

/** Controls the visibility of the auth-token dialog. */
const showAuthDialog = ref(false)

/** Local, editable copy of the JWT bound to the dialog's textarea. */
const tokenInput = ref('')

/**
 * Open the auth-token dialog, seeding the textarea with the currently
 * configured token so users can inspect or edit it in place.
 */
function openAuthDialog(): void {
  tokenInput.value = token.value
  showAuthDialog.value = true
}

/**
 * Persist the value currently in the textarea as the new JWT and close the
 * dialog. An empty value clears the token.
 */
function handleSaveToken(): void {
  setToken(tokenInput.value)
  showAuthDialog.value = false
}

/**
 * Clear the stored JWT and close the dialog. The shield icon will switch to
 * its "unlocked" variant and no `Authorization` header will be emitted on
 * subsequent API calls.
 */
function handleClearToken(): void {
  clearToken()
  tokenInput.value = ''
  showAuthDialog.value = false
}

onMounted(() => {
  // Load the auth token first so any early consumers (e.g. API-client token
  // resolvers or future route guards) observe the persisted value.
  initAuth()
  initTheme()
  initLocale()
})
</script>

<style scoped>
/*
 * Render the JWT textarea in a monospace font so tokens are easier to read
 * and inspect. The inner `<textarea>` element does not inherit the parent's
 * font-family by default, so we target it via `:deep()`.
 */
.font-monospace :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
