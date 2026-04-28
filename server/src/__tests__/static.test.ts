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
 * Tests for the BFF static file serving and SPA fallback.
 *
 * Creates a temporary directory with test files, mounts the static
 * middleware on an Express app, and verifies that files are served
 * correctly and unmatched routes fall back to index.html.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { mountStaticServing } from '../static.js'

/** HTML content used as the test index.html file. */
const INDEX_HTML_CONTENT = '<!DOCTYPE html><html><body>Test SPA</body></html>'

/** CSS content used as a test static asset. */
const CSS_FILE_CONTENT = 'body { color: red; }'

/** JavaScript content used as a test static asset. */
const JS_FILE_CONTENT = 'console.log("hello");'

describe('static file serving', () => {
  let tmpDir: string
  let app: ReturnType<typeof express>

  beforeAll(async () => {
    // Create a temporary directory with test static files
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bff-static-test-'))
    await fs.writeFile(path.join(tmpDir, 'index.html'), INDEX_HTML_CONTENT)
    await fs.mkdir(path.join(tmpDir, 'assets'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'assets', 'style.css'), CSS_FILE_CONTENT)
    await fs.writeFile(path.join(tmpDir, 'assets', 'app.js'), JS_FILE_CONTENT)

    app = express()
    mountStaticServing(app, tmpDir)
  })

  afterAll(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('serves index.html at the root path', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.text).toContain('Test SPA')
  })

  it('serves CSS files from the assets subdirectory', async () => {
    const res = await request(app).get('/assets/style.css')
    expect(res.status).toBe(200)
    expect(res.text).toBe(CSS_FILE_CONTENT)
  })

  it('serves JavaScript files from the assets subdirectory', async () => {
    const res = await request(app).get('/assets/app.js')
    expect(res.status).toBe(200)
    expect(res.text).toBe(JS_FILE_CONTENT)
  })

  it.each([
    { route: '/unknown', label: 'single-segment unknown route' },
    { route: '/some/unknown/route', label: 'multi-segment unknown route' },
    { route: '/deeply/nested/vue-router/path', label: 'deep nested route' },
    { route: '/dashboard', label: 'app-like route' },
  ])(
    'returns index.html for SPA fallback: $label',
    async ({ route }) => {
      const res = await request(app).get(route)
      expect(res.status).toBe(200)
      expect(res.text).toBe(INDEX_HTML_CONTENT)
    },
  )
})
