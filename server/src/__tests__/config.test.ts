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
 * Tests for the BFF server configuration module.
 *
 * Verifies that environment variables are parsed correctly, that defaults
 * are applied when env vars are missing, and that the config env map
 * parameter avoids mutating process.env.
 */

import { describe, it, expect } from 'vitest'
import { parsePort, loadConfig } from '../config.js'

/** Default port returned when PORT env var is missing or invalid. */
const DEFAULT_PORT = 3000

/** Default upstream URL for TIL service. */
const DEFAULT_TIL_API_URL = 'http://til-service:8080'

/** Default upstream URL for TIR service. */
const DEFAULT_TIR_API_URL = 'http://tir-service:8080'

/** Default upstream URL for CCS service. */
const DEFAULT_CCS_API_URL = 'http://ccs-service:8080'

/** Default upstream URL for ODRL service. */
const DEFAULT_ODRL_API_URL = 'http://odrl-service:8080'

/** Default auth config JSON. */
const DEFAULT_AUTH_CONFIG_JSON = '{"providers":[]}'

/** Default static directory path. */
const DEFAULT_STATIC_DIR = '../dist'

describe('parsePort', () => {
  it.each([
    { input: undefined, label: 'undefined' },
    { input: '', label: 'empty string' },
    { input: 'abc', label: 'non-numeric string' },
    { input: '0', label: 'zero (below valid range)' },
    { input: '-1', label: 'negative number' },
    { input: '65536', label: 'above maximum port (65535)' },
    { input: '99999', label: 'well above maximum port' },
  ])(
    'returns default port for invalid input: $label',
    ({ input }) => {
      expect(parsePort(input)).toBe(DEFAULT_PORT)
    },
  )

  it.each([
    { input: '1', expected: 1, label: 'minimum valid port' },
    { input: '80', expected: 80, label: 'HTTP port' },
    { input: '443', expected: 443, label: 'HTTPS port' },
    { input: '3000', expected: 3000, label: 'default BFF port' },
    { input: '8080', expected: 8080, label: 'common dev port' },
    { input: '65535', expected: 65535, label: 'maximum valid port' },
  ])('parses valid port $input ($label)', ({ input, expected }) => {
    expect(parsePort(input)).toBe(expected)
  })
})

describe('loadConfig', () => {
  it('returns all default values when no env vars are set', () => {
    const config = loadConfig({})

    expect(config).toEqual({
      port: DEFAULT_PORT,
      tilApiUrl: DEFAULT_TIL_API_URL,
      tirApiUrl: DEFAULT_TIR_API_URL,
      ccsApiUrl: DEFAULT_CCS_API_URL,
      odrlApiUrl: DEFAULT_ODRL_API_URL,
      authConfigJson: DEFAULT_AUTH_CONFIG_JSON,
      staticDir: DEFAULT_STATIC_DIR,
    })
  })

  it('reads all custom values from env vars', () => {
    const env = {
      PORT: '9090',
      TIL_API_URL: 'http://custom-til:3000',
      TIR_API_URL: 'http://custom-tir:3000',
      CCS_API_URL: 'http://custom-ccs:3000',
      ODRL_API_URL: 'http://custom-odrl:3000',
      AUTH_CONFIG_JSON: '{"providers":[{"name":"keycloak"}]}',
      STATIC_DIR: '/var/www/html',
    }

    const config = loadConfig(env)

    expect(config).toEqual({
      port: 9090,
      tilApiUrl: 'http://custom-til:3000',
      tirApiUrl: 'http://custom-tir:3000',
      ccsApiUrl: 'http://custom-ccs:3000',
      odrlApiUrl: 'http://custom-odrl:3000',
      authConfigJson: '{"providers":[{"name":"keycloak"}]}',
      staticDir: '/var/www/html',
    })
  })

  it('falls back to default port when PORT is invalid', () => {
    const config = loadConfig({ PORT: 'not-a-number' })
    expect(config.port).toBe(DEFAULT_PORT)
  })

  it.each([
    { envVar: 'TIL_API_URL', configKey: 'tilApiUrl', value: 'http://my-til:9999' },
    { envVar: 'TIR_API_URL', configKey: 'tirApiUrl', value: 'http://my-tir:9999' },
    { envVar: 'CCS_API_URL', configKey: 'ccsApiUrl', value: 'http://my-ccs:9999' },
    { envVar: 'ODRL_API_URL', configKey: 'odrlApiUrl', value: 'http://my-odrl:9999' },
    { envVar: 'AUTH_CONFIG_JSON', configKey: 'authConfigJson', value: '{"custom":true}' },
    { envVar: 'STATIC_DIR', configKey: 'staticDir', value: '/custom/path' },
  ])(
    'allows individual override of $envVar',
    ({ envVar, configKey, value }) => {
      const config = loadConfig({ [envVar]: value })
      expect(config[configKey as keyof typeof config]).toBe(value)
    },
  )

  it('does not mutate process.env when using custom env map', () => {
    const originalTilUrl = process.env.TIL_API_URL
    loadConfig({ TIL_API_URL: 'http://should-not-leak:1234' })
    expect(process.env.TIL_API_URL).toBe(originalTilUrl)
  })
})
