/**
 * Vitest global setup file.
 *
 * Polyfills browser APIs that are not available in jsdom but required
 * by Vuetify components (e.g. ResizeObserver, IntersectionObserver).
 */

/* ── ResizeObserver polyfill ─────────────────────────────────────── */

class ResizeObserverStub {
  constructor(_callback: ResizeObserverCallback) {
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
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

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

globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

/* ── visualViewport polyfill ─────────────────────────────────────── */

/**
 * Minimal `visualViewport` polyfill. jsdom does not implement the Visual
 * Viewport API, but some Vuetify components (e.g. `VMenu` via its
 * `VOverlay` child) read `window.visualViewport.{width,height}` when
 * computing their location strategy. Omitting it causes those components
 * to throw during open().
 */
if (typeof window !== 'undefined' && window.visualViewport === undefined) {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      onresize: null,
      onscroll: null,
      addEventListener: () => {
        /* no-op */
      },
      removeEventListener: () => {
        /* no-op */
      },
      dispatchEvent: () => false,
    },
  })
}

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
