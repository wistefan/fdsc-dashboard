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
 * Unit tests for the Apisix Dashboard configuration loader.
 *
 * Covers:
 * - Empty / missing config in both sources → `upstreamUrl` is `null`.
 * - Runtime `window.__APISIX_CONFIG__` takes precedence over env var.
 * - Build-time `VITE_APISIX_DASHBOARD_URL` env var fallback.
 * - Whitespace-only values are treated as unset.
 * - `isApisixConfigured` helper returns the correct boolean.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isApisixConfigured, loadApisixConfig } from '@/apisix/config'
import {
  BUILD_TIME_APISIX_URL_ENV_VAR,
  RUNTIME_APISIX_CONFIG_GLOBAL,
} from '@/apisix/constants'
import type { ApisixConfig } from '@/apisix/types'

/** A valid upstream URL used in test fixtures. */
const VALID_UPSTREAM_URL = 'http://apisix-dashboard:9000'

/** An alternative URL to verify precedence. */
const ALT_UPSTREAM_URL = 'http://other-host:9000'

/**
 * Set the runtime global `window.__APISIX_CONFIG__` to the given value.
 *
 * @param value - the value to assign.
 */
function setRuntimeConfig(value: unknown): void {
  (window as unknown as Record<string, unknown>)[RUNTIME_APISIX_CONFIG_GLOBAL] = value
}

/** Remove the runtime global so tests do not leak state. */
function clearRuntimeConfig(): void {
  delete (window as unknown as Record<string, unknown>)[RUNTIME_APISIX_CONFIG_GLOBAL]
}

/**
 * Temporarily override a Vite env var; returns a restorer function.
 *
 * @param name - the env var name.
 * @param value - the value to set, or `undefined` to delete.
 * @returns a function that restores the original value.
 */
function stubEnv(name: string, value: string | undefined): () => void {
  const env = import.meta.env as unknown as Record<string, unknown>
  const had = name in env
  const previous = env[name]
  if (value === undefined) {
    delete env[name]
  } else {
    env[name] = value
  }
  return () => {
    if (had) {
      env[name] = previous
    } else {
      delete env[name]
    }
  }
}

describe('loadApisixConfig', () => {
  let restoreEnv: () => void = () => {}

  beforeEach(() => {
    restoreEnv = stubEnv(BUILD_TIME_APISIX_URL_ENV_VAR, undefined)
    clearRuntimeConfig()
  })

  afterEach(() => {
    restoreEnv()
    clearRuntimeConfig()
  })

  it('returns null upstreamUrl when neither source is present', () => {
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBeNull()
    expect(isApisixConfigured(config)).toBe(false)
  })

  it('reads from the runtime global when set', () => {
    setRuntimeConfig({ upstreamUrl: VALID_UPSTREAM_URL })
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBe(VALID_UPSTREAM_URL)
    expect(isApisixConfigured(config)).toBe(true)
  })

  it('falls back to the Vite env var when no runtime config is present', () => {
    restoreEnv()
    restoreEnv = stubEnv(BUILD_TIME_APISIX_URL_ENV_VAR, VALID_UPSTREAM_URL)
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBe(VALID_UPSTREAM_URL)
    expect(isApisixConfigured(config)).toBe(true)
  })

  it('gives runtime config precedence over the env var', () => {
    setRuntimeConfig({ upstreamUrl: VALID_UPSTREAM_URL })
    restoreEnv()
    restoreEnv = stubEnv(BUILD_TIME_APISIX_URL_ENV_VAR, ALT_UPSTREAM_URL)
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBe(VALID_UPSTREAM_URL)
  })

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['tab and newline', '\t\n'],
  ])('treats env var with %s as unset', (_label, value) => {
    restoreEnv()
    restoreEnv = stubEnv(BUILD_TIME_APISIX_URL_ENV_VAR, value)
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBeNull()
  })

  it.each([
    ['empty string upstreamUrl', { upstreamUrl: '' }],
    ['whitespace-only upstreamUrl', { upstreamUrl: '   ' }],
    ['missing upstreamUrl key', {}],
    ['null upstreamUrl', { upstreamUrl: null }],
    ['numeric upstreamUrl', { upstreamUrl: 42 }],
    ['undefined global value', undefined],
    ['null global value', null],
  ])('treats runtime config with %s as unset', (_label, value) => {
    if (value !== undefined) {
      setRuntimeConfig(value)
    }
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBeNull()
  })

  it('ignores a runtime global that is an array', () => {
    setRuntimeConfig([VALID_UPSTREAM_URL])
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBeNull()
  })

  it('ignores a runtime global that is a plain string', () => {
    setRuntimeConfig(VALID_UPSTREAM_URL)
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBeNull()
  })

  it('trims whitespace from a valid URL', () => {
    setRuntimeConfig({ upstreamUrl: `  ${VALID_UPSTREAM_URL}  ` })
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBe(VALID_UPSTREAM_URL)
  })

  it('trims whitespace from a valid env var URL', () => {
    restoreEnv()
    restoreEnv = stubEnv(BUILD_TIME_APISIX_URL_ENV_VAR, `  ${VALID_UPSTREAM_URL}  `)
    const config = loadApisixConfig()
    expect(config.upstreamUrl).toBe(VALID_UPSTREAM_URL)
  })

  it('returns a frozen object', () => {
    setRuntimeConfig({ upstreamUrl: VALID_UPSTREAM_URL })
    const config = loadApisixConfig()
    expect(Object.isFrozen(config)).toBe(true)
  })
})

describe('isApisixConfigured', () => {
  it.each([
    ['configured', { upstreamUrl: VALID_UPSTREAM_URL } as ApisixConfig, true],
    ['unconfigured', { upstreamUrl: null } as ApisixConfig, false],
  ])('returns %s for %s config', (_label, config, expected) => {
    expect(isApisixConfigured(config)).toBe(expected)
  })
})
