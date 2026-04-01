import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

/**
 * Vue I18n plugin instance.
 * English is loaded eagerly as the default locale.
 * Additional locales can be added by importing their JSON and
 * registering them in the `messages` object.
 */
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
})
