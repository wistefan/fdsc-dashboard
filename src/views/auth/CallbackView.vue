<template>
  <div class="callback-view-container">
    <v-card
      class="callback-card mx-auto"
      max-width="480"
    >
      <!-- Loading state -->
      <template v-if="uiState === 'loading'">
        <v-card-item>
          <template #prepend>
            <v-progress-circular
              indeterminate
              color="primary"
              size="32"
              width="3"
            />
          </template>
          <v-card-title class="text-h6">
            {{ t('auth.returningTitle') }}
          </v-card-title>
          <v-card-subtitle>
            {{ t('auth.returningSubtitle', { provider: providerDisplayName }) }}
          </v-card-subtitle>
        </v-card-item>
      </template>

      <!-- Error state -->
      <template v-else-if="uiState === 'error'">
        <v-card-item>
          <template #prepend>
            <v-icon
              size="32"
              color="error"
            >
              mdi-alert-circle
            </v-icon>
          </template>
          <v-card-title class="text-h6">
            {{ t('auth.callbackFailedTitle') }}
          </v-card-title>
        </v-card-item>

        <v-card-text>
          <v-alert
            type="error"
            variant="tonal"
            class="mb-3"
          >
            {{ store.error ?? t('auth.callbackFailed') }}
          </v-alert>
          <p class="text-body-2 text-medium-emphasis">
            {{ t('auth.callbackFailed') }}
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="goToLogin"
          >
            {{ t('auth.backToLogin') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="store.status === 'authenticating'"
            @click="retry"
          >
            {{ t('auth.callbackRetry') }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </div>
</template>

<script setup lang="ts">
/**
 * OAuth2 authorisation-code callback view.
 *
 * Mounted at `/callback/:providerId` and invoked exactly once per sign-in
 * redirect. Responsibilities:
 *
 * 1. Call {@link useAuthStore.handleCallback} on mount to exchange the
 *    authorisation code for an ID / access token pair and populate the
 *    auth store.
 * 2. Render three states:
 *    - `loading` while the token exchange is in flight.
 *    - `error` with a retry affordance when the exchange fails.
 *    - `success` → navigate away immediately, so this state never renders
 *      explicitly; the router pushes the user to the preserved
 *      `returnTo` path.
 * 3. Guard against a missing / unknown provider id by showing the error
 *    state with a back-to-login button instead of throwing.
 *
 * Does not render any chrome when auth is disabled — the router guard
 * never routes here in that case.
 */

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import {
  LOGIN_ROUTE_PATH,
  RETURN_TO_STORAGE_KEY,
} from '@/auth/constants'

/** Route param name that carries the provider id. */
const PROVIDER_ID_PARAM = 'providerId'

/** Default target when no `returnTo` path is preserved. */
const DEFAULT_RETURN_TO = '/'

/** UI state enum used to pick between the loading and error branches. */
type CallbackUiState = 'loading' | 'error'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useAuthStore()

/** Current UI state. Starts in `loading`; flipped to `error` on failure. */
const uiState = ref<CallbackUiState>('loading')

/** Resolve the provider id from the dynamic route parameter. */
const providerId = computed<string>(() => {
  const raw = route.params[PROVIDER_ID_PARAM]
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')
})

/** Pretty name of the active provider for user-facing messages. */
const providerDisplayName = computed<string>(() => {
  const match = store.providers.find((p) => p.id === providerId.value)
  return match?.displayName ?? providerId.value
})

/**
 * Read and clear the preserved post-login target path.
 *
 * @returns the path the user originally requested, or the default.
 */
function consumeReturnTo(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_RETURN_TO
  }
  const value = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)
  if (value !== null) {
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY)
    return value
  }
  return DEFAULT_RETURN_TO
}

/**
 * Run the authorisation-code exchange against the auth store. On success,
 * flips the app back to the preserved `returnTo` path. On failure,
 * switches to the error state so the user can retry.
 */
async function exchangeCode(): Promise<void> {
  if (providerId.value === '') {
    uiState.value = 'error'
    store.error = t('auth.unknownProvider')
    return
  }
  uiState.value = 'loading'
  try {
    await store.handleCallback(providerId.value)
    const target = consumeReturnTo()
    await router.replace(target)
  } catch {
    // `store.error` is already populated by the action.
    uiState.value = 'error'
  }
}

/** Retry the code exchange, clearing the previous error. */
async function retry(): Promise<void> {
  store.error = null
  await exchangeCode()
}

/** Return the user to the provider picker, clearing any pending error. */
async function goToLogin(): Promise<void> {
  store.error = null
  store.$reset()
  await router.replace(LOGIN_ROUTE_PATH)
}

onMounted(() => {
  // Fire and forget — the method flips uiState / navigates internally.
  void exchangeCode()
})
</script>

<style scoped>
.callback-view-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 3rem;
}

.callback-card {
  width: 100%;
}
</style>
