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
 * Type definitions for the Apisix Dashboard integration.
 *
 * The configuration tells fdsc-dashboard whether an upstream Apisix Dashboard
 * instance is available and, if so, where the reverse proxy should forward
 * requests.
 */

/**
 * Resolved configuration for the embedded Apisix Dashboard.
 *
 * When {@link upstreamUrl} is `null` the integration is considered
 * unconfigured: the navigation-drawer entry is hidden and the `/apisix`
 * route renders a "not configured" informational alert instead of an iframe.
 */
export interface ApisixConfig {
  /** Upstream URL the reverse proxy forwards `/apisix-dashboard/*` to, or `null` when unconfigured. */
  readonly upstreamUrl: string | null
}
