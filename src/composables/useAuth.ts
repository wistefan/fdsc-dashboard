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
 * Composable that exposes role-based access helpers to views.
 *
 * The dashboard recognises two canonical roles:
 * - `admin` — may create, read, update, and delete resources.
 * - `viewer` — read-only access.
 *
 * When authentication is *disabled* (zero providers configured) the
 * helpers return `true` for every capability so the dashboard keeps its
 * legacy unauthenticated-by-default behaviour. When a provider is
 * configured, the helpers mirror the active {@link useAuthStore}
 * getters, so the UI reacts to logins/logouts without any extra plumbing.
 *
 * Usage:
 * ```ts
 * import { useAuth } from '@/composables/useAuth'
 *
 * const { canEdit, canDelete } = useAuth()
 * // Hide a create button for viewers:
 * // <v-btn v-if="canEdit" …>
 * ```
 */

import { computed, type ComputedRef } from 'vue'

import { useAuthStore } from '@/stores/auth'

/**
 * Reactive access-control helpers returned by {@link useAuth}.
 *
 * Every helper returns `true` when auth is disabled so that the
 * dashboard's default "open mode" remains fully operable without any
 * provider configured.
 */
export interface UseAuthResult {
  /** Whether the current user has the canonical `admin` role. */
  readonly isAdmin: ComputedRef<boolean>

  /**
   * Whether the current user has at least the `viewer` role. Admins
   * are also treated as viewers (admin implies viewer).
   */
  readonly isViewer: ComputedRef<boolean>

  /**
   * Whether the current user may create / edit resources. Mirrors
   * {@link isAdmin}; exposed as a named capability for readability at
   * call sites.
   */
  readonly canEdit: ComputedRef<boolean>

  /**
   * Whether the current user may delete resources. Mirrors
   * {@link isAdmin}; exposed as a named capability for readability at
   * call sites.
   */
  readonly canDelete: ComputedRef<boolean>

  /** Whether at least one OAuth2 provider is configured. */
  readonly isAuthEnabled: ComputedRef<boolean>

  /**
   * Whether a user is currently signed in. When auth is disabled this
   * is always `true` so downstream code can treat "auth-disabled" and
   * "signed-in" uniformly.
   */
  readonly isAuthenticated: ComputedRef<boolean>
}

/**
 * Build the reactive {@link UseAuthResult} backed by the auth Pinia store.
 *
 * The returned refs are thin `computed` wrappers that follow the store
 * so callers can use them inside `<template>` blocks, inside other
 * composables, or as watchers.
 *
 * @returns role-based capability flags for the current user.
 */
export function useAuth(): UseAuthResult {
  const store = useAuthStore()

  /** Whether the signed-in user has the canonical admin role. */
  const isAdmin = computed<boolean>(() => store.isAdmin)

  /** Whether the signed-in user has at least viewer privileges. */
  const isViewer = computed<boolean>(() => store.isViewer)

  /** Whether the signed-in user may create or edit resources. */
  const canEdit = computed<boolean>(() => store.isAdmin)

  /** Whether the signed-in user may delete resources. */
  const canDelete = computed<boolean>(() => store.isAdmin)

  /** Whether auth is enabled at all (at least one provider configured). */
  const isAuthEnabled = computed<boolean>(() => store.isAuthEnabled)

  /** Whether a user session is currently active. */
  const isAuthenticated = computed<boolean>(() => store.isAuthenticated)

  return {
    isAdmin,
    isViewer,
    canEdit,
    canDelete,
    isAuthEnabled,
    isAuthenticated,
  }
}
