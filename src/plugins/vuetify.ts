import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

/**
 * Vuetify plugin instance with light and dark theme definitions.
 * Theme customization is managed here; runtime toggling is handled
 * by the `useTheme` composable.
 */
export const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1565C0',
          secondary: '#424242',
          accent: '#FF6F00',
          error: '#D32F2F',
          info: '#0288D1',
          success: '#388E3C',
          warning: '#F57C00',
          background: '#FAFAFA',
          surface: '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#42A5F5',
          secondary: '#B0BEC5',
          accent: '#FFB74D',
          error: '#EF5350',
          info: '#29B6F6',
          success: '#66BB6A',
          warning: '#FFA726',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
})
