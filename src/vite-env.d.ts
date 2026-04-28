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
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** Base URL for the Trusted Issuers List management API. */
  readonly VITE_TIL_API_URL: string
  /** Base URL for the Trusted Issuers Registry (EBSI) API. */
  readonly VITE_TIR_API_URL: string
  /** Base URL for the Credentials Config Service API. */
  readonly VITE_CCS_API_URL: string
  /** Base URL for the ODRL-PAP API. */
  readonly VITE_ODRL_API_URL: string
  /**
   * Optional build-time seed for the JWT sent as `Authorization: Bearer …`
   * on every API request. When set, the value is loaded at startup unless a
   * user-provided token is already persisted in `localStorage`.
   */
  readonly VITE_AUTH_TOKEN?: string
  /**
   * JSON-encoded list of OAuth2 / OIDC provider configurations used as a
   * build-time fallback when no runtime configuration is injected via
   * `window.__AUTH_CONFIG__`. May be either a raw array of provider objects
   * or an object of the form `{ "providers": [...] }`.
   */
  readonly VITE_AUTH_PROVIDERS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Runtime-injected authentication configuration.
 *
 * A host-rendered `/config.js` snippet may set `window.__AUTH_CONFIG__` to
 * an `AuthConfig`-shaped object (or its JSON string form) before the Vue
 * application bootstraps. When absent, the dashboard falls back to the
 * `VITE_AUTH_PROVIDERS` env var, then to the "auth disabled" state.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Window {
  __AUTH_CONFIG__?: unknown
  /**
   * Runtime-injected API URL configuration.
   *
   * Set by the nginx entrypoint script (`10-render-config.sh`) when the
   * container starts. Contains per-service base URLs built from `TIL_API_URL`,
   * `TIR_API_URL`, `CCS_API_URL`, and `ODRL_API_URL` environment variables.
   * Empty strings indicate that the default proxy path should be used.
   *
   * When absent (e.g. in local dev mode), `configureApiClients()` falls back
   * to `import.meta.env.VITE_*` variables and then to the default proxy paths.
   */
  __API_CONFIG__?: unknown
}
