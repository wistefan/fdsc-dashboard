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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
