/**
 * Vitest global setup file.
 *
 * Polyfills browser APIs that are not available in jsdom but required
 * by Vuetify components (e.g. ResizeObserver, IntersectionObserver).
 */

import { vi } from 'vitest'

/* ── ResizeObserver polyfill ─────────────────────────────────────── */

class ResizeObserverStub {
  /** Callback provided to the observer (unused in stub). */
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(): void {
    /* no-op */
  }

  unobserve(): void {
    /* no-op */
  }

  disconnect(): void {
    /* no-op */
  }
}

global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

/* ── IntersectionObserver polyfill ───────────────────────────────── */

class IntersectionObserverStub {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    /* no-op */
  }

  observe(): void {
    /* no-op */
  }

  unobserve(): void {
    /* no-op */
  }

  disconnect(): void {
    /* no-op */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

/* ── Suppress Vue warnings in tests ─────────────────────────────── */

// Suppress console.warn for known Vuetify warnings in test environment
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const message = String(args[0])
  // Suppress Vuetify-internal warnings about missing directives etc.
  if (message.includes('[Vue warn]') || message.includes('[Vuetify]')) {
    return
  }
  originalWarn.call(console, ...args)
}
