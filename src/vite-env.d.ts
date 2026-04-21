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
}
