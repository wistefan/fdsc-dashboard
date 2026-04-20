/**
 * Unit tests for the OAuth2 auth configuration loader.
 *
 * Covers:
 * - Empty / missing config → auth disabled.
 * - Malformed JSON → disabled with a logged warning.
 * - Single provider, multiple providers, object vs array shapes.
 * - Default-scope fallback.
 * - Invalid provider entries are dropped; valid ones are kept.
 * - `getProviderById` and `resolveScopes` helpers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getProviderById,
  isAuthEnabled,
  loadAuthConfig,
  resolveScopes,
} from '@/auth/config'
import {
  DEFAULT_OAUTH_SCOPES,
  RUNTIME_CONFIG_GLOBAL,
} from '@/auth/constants'
import type { OAuthProviderConfig } from '@/auth/types'

/** A structurally valid raw provider object. */
const VALID_PROVIDER_RAW = {
  id: 'keycloak',
  displayName: 'Keycloak',
  issuer: 'https://id.example.com/realms/main',
  clientId: 'fdsc-dashboard',
}

/** A second valid provider so multi-provider scenarios have two entries. */
const SECOND_PROVIDER_RAW = {
  id: 'auth0',
  displayName: 'Auth0',
  issuer: 'https://example.auth0.com',
  clientId: 'fdsc-dashboard',
}

/**
 * Replace `window.__AUTH_CONFIG__` with the given value. Using
 * `Object.defineProperty` avoids the TS `any` cast sprawl elsewhere.
 */
function setRuntimeConfig(value: unknown): void {
  (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL] = value
}

/** Remove any test-specified runtime global so tests do not leak state. */
function clearRuntimeConfig(): void {
  delete (window as unknown as Record<string, unknown>)[RUNTIME_CONFIG_GLOBAL]
}

/** Temporarily override a Vite env var; returns a restorer. */
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

describe('loadAuthConfig', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let restoreEnv: () => void = () => {}

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    restoreEnv = stubEnv('VITE_AUTH_PROVIDERS', undefined)
    clearRuntimeConfig()
  })

  afterEach(() => {
    warnSpy.mockRestore()
    restoreEnv()
    clearRuntimeConfig()
  })

  it('returns an empty config when neither source is present', () => {
    const config = loadAuthConfig()
    expect(config.providers).toEqual([])
    expect(isAuthEnabled(config)).toBe(false)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('parses a runtime object with a providers array', () => {
    setRuntimeConfig({ providers: [VALID_PROVIDER_RAW] })
    const config = loadAuthConfig()
    expect(config.providers).toHaveLength(1)
    expect(config.providers[0].id).toBe('keycloak')
    expect(isAuthEnabled(config)).toBe(true)
  })

  it('parses a runtime raw array as the provider list', () => {
    setRuntimeConfig([VALID_PROVIDER_RAW, SECOND_PROVIDER_RAW])
    const config = loadAuthConfig()
    expect(config.providers.map((p) => p.id)).toEqual(['keycloak', 'auth0'])
  })

  it('parses a runtime JSON string', () => {
    setRuntimeConfig(JSON.stringify({ providers: [VALID_PROVIDER_RAW] }))
    const config = loadAuthConfig()
    expect(config.providers).toHaveLength(1)
  })

  it('falls back to the Vite env var when no runtime config is present', () => {
    restoreEnv()
    restoreEnv = stubEnv(
      'VITE_AUTH_PROVIDERS',
      JSON.stringify([VALID_PROVIDER_RAW]),
    )
    const config = loadAuthConfig()
    expect(config.providers).toHaveLength(1)
    expect(config.providers[0].id).toBe('keycloak')
  })

  it('logs a warning and disables auth on malformed JSON', () => {
    setRuntimeConfig('not valid json {')
    const config = loadAuthConfig()
    expect(config.providers).toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['missing id', { ...VALID_PROVIDER_RAW, id: undefined }],
    ['empty issuer', { ...VALID_PROVIDER_RAW, issuer: '' }],
    ['numeric clientId', { ...VALID_PROVIDER_RAW, clientId: 42 }],
    ['null entry', null],
  ])('drops an invalid provider entry (%s)', (_label, badEntry) => {
    setRuntimeConfig([badEntry, SECOND_PROVIDER_RAW])
    const config = loadAuthConfig()
    expect(config.providers.map((p) => p.id)).toEqual(['auth0'])
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('logs a warning when parsed JSON is not an array or {providers}', () => {
    setRuntimeConfig(JSON.stringify({ foo: 'bar' }))
    const config = loadAuthConfig()
    expect(config.providers).toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})

describe('isAuthEnabled', () => {
  it.each([
    [[], false],
    [[VALID_PROVIDER_RAW], true],
    [[VALID_PROVIDER_RAW, SECOND_PROVIDER_RAW], true],
  ])('returns %s for %o providers', (providersRaw, expected) => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      setRuntimeConfig({ providers: providersRaw })
      expect(isAuthEnabled(loadAuthConfig())).toBe(expected)
    } finally {
      spy.mockRestore()
      clearRuntimeConfig()
    }
  })
})

describe('getProviderById', () => {
  it('returns the matching provider', () => {
    setRuntimeConfig([VALID_PROVIDER_RAW, SECOND_PROVIDER_RAW])
    try {
      const config = loadAuthConfig()
      expect(getProviderById(config, 'auth0')?.displayName).toBe('Auth0')
    } finally {
      clearRuntimeConfig()
    }
  })

  it('returns undefined for an unknown id', () => {
    setRuntimeConfig([VALID_PROVIDER_RAW])
    try {
      expect(getProviderById(loadAuthConfig(), 'nope')).toBeUndefined()
    } finally {
      clearRuntimeConfig()
    }
  })
})

describe('resolveScopes', () => {
  it('returns DEFAULT_OAUTH_SCOPES when the provider omits scopes', () => {
    const provider: OAuthProviderConfig = {
      id: 'p',
      displayName: 'P',
      issuer: 'https://p',
      clientId: 'c',
    }
    expect(resolveScopes(provider)).toBe(DEFAULT_OAUTH_SCOPES)
  })

  it('returns the provider-specified scopes when present', () => {
    const provider: OAuthProviderConfig = {
      id: 'p',
      displayName: 'P',
      issuer: 'https://p',
      clientId: 'c',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    }
    expect(resolveScopes(provider)).toEqual([
      'openid',
      'profile',
      'email',
      'offline_access',
    ])
  })

  it('does not include `email` by default (data minimisation)', () => {
    expect(DEFAULT_OAUTH_SCOPES).not.toContain('email')
    expect(DEFAULT_OAUTH_SCOPES).toContain('openid')
  })
})
