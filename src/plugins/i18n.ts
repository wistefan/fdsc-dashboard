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
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

/**
 * Message schema type derived from the English locale.
 * Used to provide type-safe translations in components.
 */
export type MessageSchema = typeof en

/**
 * Vue I18n plugin instance.
 *
 * English is loaded eagerly as the default (and fallback) locale.
 *
 * **Adding a new locale:**
 * 1. Create `src/locales/<code>.json` matching the structure of `en.json`
 * 2. Import it here and add to the `messages` object
 * 3. Register it in `AVAILABLE_LOCALES` inside `src/composables/useLocale.ts`
 */
export const i18n = createI18n<[MessageSchema], 'en'>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
})
