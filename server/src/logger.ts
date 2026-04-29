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
 * Minimal level-aware logger for the BFF server.
 *
 * Supports four severity levels (debug, info, warn, error). Messages below
 * the configured threshold are silently discarded. This avoids pulling in
 * a full logging framework while still giving operators control over
 * verbosity via the `LOG_LEVEL` environment variable.
 */

/** Supported log severity levels, ordered from most to least verbose. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Numeric priority for each level — lower values are more verbose. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/** Set of valid level strings, used for input validation. */
const VALID_LEVELS = new Set<string>(Object.keys(LEVEL_PRIORITY))

/**
 * A structured logger whose methods correspond to severity levels.
 *
 * Each method only produces output when the logger's configured threshold
 * allows it. For example, a logger created with level `info` will emit
 * `info`, `warn`, and `error` messages but silently discard `debug`.
 */
export interface Logger {
  /** Logs a message at debug level (verbose operational detail). */
  debug(message: string): void
  /** Logs a message at info level (normal operational events). */
  info(message: string): void
  /** Logs a message at warn level (unexpected but recoverable situations). */
  warn(message: string): void
  /** Logs a message at error level (failures requiring attention). */
  error(message: string): void
}

/**
 * Parses a raw string into a valid {@link LogLevel}.
 *
 * The comparison is case-insensitive. Returns `info` for unrecognised or
 * missing values so the server always starts with a sensible default.
 *
 * @param value - Raw string from an environment variable
 * @returns A valid log level
 */
export function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return 'info'
  }
  const normalised = value.trim().toLowerCase()
  if (VALID_LEVELS.has(normalised)) {
    return normalised as LogLevel
  }
  return 'info'
}

/**
 * Creates a {@link Logger} that discards messages below the given threshold.
 *
 * @param level - Minimum severity level to emit
 * @returns A logger instance
 */
export function createLogger(level: LogLevel): Logger {
  const threshold = LEVEL_PRIORITY[level]

  return {
    debug: (message: string) => {
      if (threshold <= LEVEL_PRIORITY.debug) {
        console.debug(message)
      }
    },
    info: (message: string) => {
      if (threshold <= LEVEL_PRIORITY.info) {
        console.log(message)
      }
    },
    warn: (message: string) => {
      if (threshold <= LEVEL_PRIORITY.warn) {
        console.warn(message)
      }
    },
    error: (message: string) => {
      if (threshold <= LEVEL_PRIORITY.error) {
        console.error(message)
      }
    },
  }
}
