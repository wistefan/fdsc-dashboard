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
  <div class="login-view-container">
    <v-card
      class="login-card mx-auto"
      max-width="480"
    >
      <v-card-item>
        <template #prepend>
          <v-icon
            size="48"
            color="primary"
          >
            mdi-shield-account
          </v-icon>
        </template>
        <v-card-title class="text-h5">
          {{ t('auth.signInTitle') }}
        </v-card-title>
        <v-card-subtitle>
          {{ t('auth.signInSubtitle') }}
        </v-card-subtitle>
      </v-card-item>

      <!-- Error alert -->
      <v-card-text v-if="store.error">
        <v-alert
          type="error"
          variant="tonal"
          closable
          @click:close="store.error = null"
        >
          {{ store.error }}
        </v-alert>
      </v-card-text>

      <!-- Provider list -->
      <v-card-text v-if="providers.length > 0">
        <div class="d-flex flex-column ga-3">
          <v-btn
            v-for="provider in providers"
            :key="provider.id"
            color="primary"
            variant="flat"
            size="large"
            :loading="pendingProviderId === provider.id"
            :disabled="isLoading && pendingProviderId !== provider.id"
            prepend-icon="mdi-login"
            block
            @click="signIn(provider.id)"
          >
            {{ t('auth.signInWith', { provider: provider.displayName }) }}
          </v-btn>
        </div>
      </v-card-text>

      <!-- No providers configured -->
      <v-card-text v-else>
        <v-alert
          type="info"
          variant="tonal"
        >
          {{ t('auth.noProviders') }}
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
/**
 * Provider-picker login view.
 *
 * Shown at `/login` by the router guard whenever authentication is enabled
 * and the user is not yet signed in. Renders one "Sign in with &lt;provider&gt;"
 * button per configured provider and delegates to
 * {@link useAuthStore.login} which issues the full-page redirect.
 *
 * When authentication is *disabled* the router guard bypasses this view
 * entirely — it will never be mounted, so the component does not need to
 * special-case that scenario.
 *
 * When the user is already signed in (for example because the session was
 * restored on app startup) the view immediately redirects to the stored
 * `returnTo` path, or to `/` if none was preserved.
 */

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { RETURN_TO_STORAGE_KEY } from '@/auth/constants'

const { t } = useI18n()
const router = useRouter()
const store = useAuthStore()

/**
 * Id of the provider whose sign-in redirect is currently being negotiated.
 * Used to render a button-level loading spinner on exactly that button
 * while all other buttons are disabled.
 */
const pendingProviderId = ref<string | null>(null)

/** Configured providers, exposed so the template can iterate over them. */
const providers = computed(() => store.providers)

/** Whether any provider is currently being authenticated. */
const isLoading = computed(() => pendingProviderId.value !== null)

/**
 * Pop the preserved post-login target path from `sessionStorage`.
 *
 * Set by the router guard before redirecting an unauthenticated user to
 * `/login`; consumed here to return them to the page they originally
 * requested once they are already signed in.
 *
 * @returns the stored path, or `null` when none is set.
 */
function consumeReturnTo(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const value = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY)
  if (value !== null) {
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY)
  }
  return value
}

/**
 * Start the OAuth2 authorisation-code redirect for the selected provider.
 *
 * @param providerId - id of the provider to sign in with.
 */
async function signIn(providerId: string): Promise<void> {
  pendingProviderId.value = providerId
  try {
    await store.login(providerId)
    // In the happy path the browser is already navigating to the
    // identity provider, so the following code rarely executes.
  } catch {
    // The store has already captured the error in `store.error`; the
    // template re-renders automatically. Reset the pending flag so the
    // user can try another provider.
    pendingProviderId.value = null
  }
}

onMounted(() => {
  // Already authenticated? Send the user straight back to where they
  // were trying to go.
  if (store.isAuthenticated && store.isAuthEnabled) {
    const target = consumeReturnTo() ?? '/'
    router.replace(target)
  }
})
</script>

<style scoped>
.login-view-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 3rem;
}

.login-card {
  width: 100%;
}
</style>
