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
 * Tests for the BFF server logger module.
 *
 * Verifies that the level-aware logger correctly filters messages below
 * the configured threshold while forwarding messages at or above it.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLogger, type LogLevel } from '../logger.js'

/** Console methods corresponding to each log level. */
const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'log' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'log',
  warn: 'warn',
  error: 'error',
}

/** All supported log levels in ascending severity order. */
const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createLogger', () => {
  it.each<{ threshold: LogLevel; method: LogLevel; shouldLog: boolean }>([
    { threshold: 'debug', method: 'debug', shouldLog: true },
    { threshold: 'debug', method: 'info', shouldLog: true },
    { threshold: 'debug', method: 'warn', shouldLog: true },
    { threshold: 'debug', method: 'error', shouldLog: true },
    { threshold: 'info', method: 'debug', shouldLog: false },
    { threshold: 'info', method: 'info', shouldLog: true },
    { threshold: 'info', method: 'warn', shouldLog: true },
    { threshold: 'info', method: 'error', shouldLog: true },
    { threshold: 'warn', method: 'debug', shouldLog: false },
    { threshold: 'warn', method: 'info', shouldLog: false },
    { threshold: 'warn', method: 'warn', shouldLog: true },
    { threshold: 'warn', method: 'error', shouldLog: true },
    { threshold: 'error', method: 'debug', shouldLog: false },
    { threshold: 'error', method: 'info', shouldLog: false },
    { threshold: 'error', method: 'warn', shouldLog: false },
    { threshold: 'error', method: 'error', shouldLog: true },
  ])(
    'threshold=$threshold, $method() $shouldLog',
    ({ threshold, method, shouldLog }) => {
      const consoleFn = CONSOLE_METHOD[method]
      const spy = vi.spyOn(console, consoleFn).mockImplementation(() => {})

      const logger = createLogger(threshold)
      logger[method]('test message')

      if (shouldLog) {
        expect(spy).toHaveBeenCalledWith('test message')
      } else {
        expect(spy).not.toHaveBeenCalled()
      }
    },
  )

  it('does not call other console methods when logging', () => {
    const spies = ALL_LEVELS.map((level) =>
      vi.spyOn(console, CONSOLE_METHOD[level]).mockImplementation(() => {}),
    )

    const logger = createLogger('debug')
    logger.info('only info')

    expect(spies[1]!.mock.calls.length).toBe(1)
    expect(spies[0]!.mock.calls.length).toBe(0)
    expect(spies[2]!.mock.calls.length).toBe(0)
    expect(spies[3]!.mock.calls.length).toBe(0)
  })
})
