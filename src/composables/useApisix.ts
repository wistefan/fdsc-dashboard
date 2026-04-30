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
/**
 * Composable that exposes the Apisix Dashboard integration state.
 *
 * Encapsulates the visibility rule so that `App.vue`, `HomeView.vue`,
 * and any future consumer share a single, consistent predicate:
 *
 * - The Apisix entry is **visible** when the upstream URL is configured
 *   *and* the user has the admin role (or auth is disabled, preserving
 *   the legacy open-mode behaviour).
 * - When the upstream URL is not set the entry is hidden regardless of
 *   the user's role.
 */

import { computed, type ComputedRef } from 'vue'
import { loadApisixConfig, isApisixConfigured } from '@/apisix/config'
import type { ApisixConfig } from '@/apisix/types'
import { useAuth } from '@/composables/useAuth'

/**
 * Return type of {@link useApisix}.
 */
export interface UseApisixResult {
  /** The resolved Apisix Dashboard configuration. */
  readonly config: ApisixConfig

  /** Whether the upstream URL is configured (non-null). */
  readonly isConfigured: boolean

  /**
   * Whether the Apisix Dashboard entry should be visible in the UI.
   *
   * `true` when the upstream URL is configured **and** the current user
   * has admin privileges (or authentication is disabled).
   */
  readonly isVisible: ComputedRef<boolean>
}

/**
 * Reactive access to the Apisix Dashboard integration state.
 *
 * @returns A {@link UseApisixResult} containing the resolved config,
 *   a static `isConfigured` flag, and a reactive `isVisible` computed.
 */
export function useApisix(): UseApisixResult {
  const config = loadApisixConfig()
  const configured = isApisixConfigured(config)
  const { isAuthEnabled, isAdmin } = useAuth()

  /**
   * The Apisix entry is visible when:
   * - The upstream URL is set (configured), **and**
   * - Auth is disabled (everyone is treated as admin), **or** the user
   *   has the admin role.
   */
  const isVisible: ComputedRef<boolean> = computed(
    () => configured && (!isAuthEnabled.value || isAdmin.value),
  )

  return { config, isConfigured: configured, isVisible }
}
