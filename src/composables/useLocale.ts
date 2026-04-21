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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/** localStorage key for persisting the selected locale. */
const LOCALE_STORAGE_KEY = 'fdsc-dashboard-locale'

/** Default locale used when no preference is stored. */
const DEFAULT_LOCALE = 'en'

/**
 * Available locales with their display labels.
 * To add a new locale:
 * 1. Create a JSON file in `src/locales/` (e.g. `de.json`)
 * 2. Import and register it in `src/plugins/i18n.ts`
 * 3. Add an entry here
 */
export const AVAILABLE_LOCALES = [
  { code: 'en', label: 'English' },
] as const

/** A locale code supported by the application. */
export type LocaleCode = (typeof AVAILABLE_LOCALES)[number]['code']

/**
 * Composable for switching the application locale.
 * Persists the user's choice in localStorage so it is
 * restored across sessions.
 *
 * @returns Reactive `currentLocale`, `availableLocales`, and `setLocale`/`initLocale` functions.
 */
export function useLocale() {
  const { locale } = useI18n()

  /** The currently active locale code. */
  const currentLocale = computed<string>(() => locale.value)

  /** List of available locales with display labels. */
  const availableLocales = AVAILABLE_LOCALES

  /**
   * Change the active locale and persist the choice.
   *
   * @param code - The locale code to activate.
   */
  function setLocale(code: string): void {
    locale.value = code
    localStorage.setItem(LOCALE_STORAGE_KEY, code)
    document.documentElement.setAttribute('lang', code)
  }

  /**
   * Restore the locale from localStorage if a previous choice exists.
   * Should be called once during application initialization.
   */
  function initLocale(): void {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved && AVAILABLE_LOCALES.some((l) => l.code === saved)) {
      locale.value = saved
      document.documentElement.setAttribute('lang', saved)
    } else {
      document.documentElement.setAttribute('lang', DEFAULT_LOCALE)
    }
  }

  return {
    currentLocale,
    availableLocales,
    setLocale,
    initLocale,
  }
}
