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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
