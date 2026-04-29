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
 * Tests for the {@link useServices} composable.
 *
 * Verifies that the composable correctly reads per-service availability
 * flags from `window.__SERVICES_CONFIG__` and falls back to all-enabled
 * when the global is absent or malformed.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { SERVICES_CONFIG_GLOBAL, loadServicesConfig } from '../useServices'

/**
 * Sets or removes the runtime services config global on the window.
 *
 * @param value - The value to assign, or `null` to remove the global
 */
function setServicesConfig(value: unknown | null): void {
  if (value === null) {
    delete (window as unknown as Record<string, unknown>)[SERVICES_CONFIG_GLOBAL]
  } else {
    (window as unknown as Record<string, unknown>)[SERVICES_CONFIG_GLOBAL] = value
  }
}

describe('loadServicesConfig', () => {
  afterEach(() => {
    setServicesConfig(null)
  })

  it('defaults to all services enabled when global is absent', () => {
    expect(loadServicesConfig()).toEqual({
      til: true,
      tir: true,
      ccs: true,
      odrl: true,
    })
  })

  it('reads all-enabled config from the global', () => {
    setServicesConfig({ til: true, tir: true, ccs: true, odrl: true })
    expect(loadServicesConfig()).toEqual({
      til: true,
      tir: true,
      ccs: true,
      odrl: true,
    })
  })

  it('reads partially-disabled config from the global', () => {
    setServicesConfig({ til: true, tir: false, ccs: true, odrl: false })
    expect(loadServicesConfig()).toEqual({
      til: true,
      tir: false,
      ccs: true,
      odrl: false,
    })
  })

  it('reads all-disabled config from the global', () => {
    setServicesConfig({ til: false, tir: false, ccs: false, odrl: false })
    expect(loadServicesConfig()).toEqual({
      til: false,
      tir: false,
      ccs: false,
      odrl: false,
    })
  })

  it.each([
    { label: 'null', value: null },
    { label: 'a string', value: 'not-an-object' },
    { label: 'a number', value: 42 },
    { label: 'an array', value: [true, true, true, true] },
  ])(
    'defaults to all-enabled when global is $label',
    ({ value }) => {
      setServicesConfig(value)
      expect(loadServicesConfig()).toEqual({
        til: true,
        tir: true,
        ccs: true,
        odrl: true,
      })
    },
  )

  it('treats missing keys as disabled', () => {
    setServicesConfig({ til: true })
    expect(loadServicesConfig()).toEqual({
      til: true,
      tir: false,
      ccs: false,
      odrl: false,
    })
  })
})
