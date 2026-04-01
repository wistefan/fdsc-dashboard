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
