/**
 * Tests for the BFF proxy middleware.
 *
 * Verifies that proxy routes are created for all four downstream services
 * with correct target URLs, path rewriting, and change-origin settings.
 * Uses a mock of http-proxy-middleware to avoid real network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { AppConfig } from '../config.js'

// Mock http-proxy-middleware — vitest hoists this above imports
vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: vi.fn(
    () =>
      (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
        next(),
  ),
}))

// Must import after the mock declaration so vitest can intercept
const { mountProxyMiddleware } = await import('../proxy.js')

/** Typed reference to the mocked createProxyMiddleware function. */
const mockedCreateProxy = vi.mocked(createProxyMiddleware)

/** Total number of downstream services proxied through the BFF. */
const EXPECTED_PROXY_COUNT = 4

/**
 * Creates a test AppConfig with optional overrides.
 *
 * @param overrides - Partial config values to override defaults
 * @returns A complete AppConfig suitable for testing
 */
function createTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 3000,
    tilApiUrl: 'http://til:8080',
    tirApiUrl: 'http://tir:8080',
    ccsApiUrl: 'http://ccs:8080',
    odrlApiUrl: 'http://odrl:8080',
    authConfigJson: '{"providers":[]}',
    staticDir: '../dist',
    ...overrides,
  }
}

describe('mountProxyMiddleware', () => {
  beforeEach(() => {
    mockedCreateProxy.mockClear()
  })

  it('creates proxy middleware for all four downstream services', () => {
    const app = express()
    mountProxyMiddleware(app, createTestConfig())

    expect(mockedCreateProxy).toHaveBeenCalledTimes(EXPECTED_PROXY_COUNT)
  })

  it.each([
    {
      service: 'Trusted Issuers List (TIL)',
      path: '/api/til',
      configKey: 'tilApiUrl' as const,
      targetUrl: 'http://til:8080',
    },
    {
      service: 'Trusted Issuers Registry (TIR)',
      path: '/api/tir',
      configKey: 'tirApiUrl' as const,
      targetUrl: 'http://tir:8080',
    },
    {
      service: 'Credentials Config Service (CCS)',
      path: '/api/ccs',
      configKey: 'ccsApiUrl' as const,
      targetUrl: 'http://ccs:8080',
    },
    {
      service: 'ODRL Policy (ODRL)',
      path: '/api/odrl',
      configKey: 'odrlApiUrl' as const,
      targetUrl: 'http://odrl:8080',
    },
  ])(
    'configures $service proxy with correct target URL',
    ({ targetUrl }) => {
      const app = express()
      mountProxyMiddleware(app, createTestConfig())

      const matchingCall = mockedCreateProxy.mock.calls.find(
        (args) => (args[0] as Record<string, unknown>)?.target === targetUrl,
      )
      expect(matchingCall).toBeDefined()
    },
  )

  it.each([
    { service: 'TIL', path: '/api/til', targetUrl: 'http://til:8080' },
    { service: 'TIR', path: '/api/tir', targetUrl: 'http://tir:8080' },
    { service: 'CCS', path: '/api/ccs', targetUrl: 'http://ccs:8080' },
    { service: 'ODRL', path: '/api/odrl', targetUrl: 'http://odrl:8080' },
  ])(
    'strips $path prefix via pathRewrite for $service proxy',
    ({ path, targetUrl }) => {
      const app = express()
      mountProxyMiddleware(app, createTestConfig())

      const matchingCall = mockedCreateProxy.mock.calls.find(
        (args) => (args[0] as Record<string, unknown>)?.target === targetUrl,
      )
      expect(matchingCall).toBeDefined()

      const options = matchingCall![0] as Record<string, unknown>
      expect(options.pathRewrite).toEqual({ [`^${path}`]: '' })
    },
  )

  it.each([
    { service: 'TIL', targetUrl: 'http://til:8080' },
    { service: 'TIR', targetUrl: 'http://tir:8080' },
    { service: 'CCS', targetUrl: 'http://ccs:8080' },
    { service: 'ODRL', targetUrl: 'http://odrl:8080' },
  ])(
    'enables changeOrigin for $service proxy',
    ({ targetUrl }) => {
      const app = express()
      mountProxyMiddleware(app, createTestConfig())

      const matchingCall = mockedCreateProxy.mock.calls.find(
        (args) => (args[0] as Record<string, unknown>)?.target === targetUrl,
      )
      expect(matchingCall).toBeDefined()

      const options = matchingCall![0] as Record<string, unknown>
      expect(options.changeOrigin).toBe(true)
    },
  )

  it('uses custom URLs from config for each service', () => {
    const customConfig = createTestConfig({
      tilApiUrl: 'http://custom-til:9000',
      tirApiUrl: 'http://custom-tir:9001',
      ccsApiUrl: 'http://custom-ccs:9002',
      odrlApiUrl: 'http://custom-odrl:9003',
    })

    const app = express()
    mountProxyMiddleware(app, customConfig)

    const targets = mockedCreateProxy.mock.calls.map(
      (args) => (args[0] as Record<string, unknown>)?.target,
    )

    expect(targets).toContain('http://custom-til:9000')
    expect(targets).toContain('http://custom-tir:9001')
    expect(targets).toContain('http://custom-ccs:9002')
    expect(targets).toContain('http://custom-odrl:9003')
  })
})
