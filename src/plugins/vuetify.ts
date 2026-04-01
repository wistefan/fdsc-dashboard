import 'vuetify/styles'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

/**
 * Light theme definition.
 * All color tokens are customizable; downstream themes can override these values.
 */
const lightTheme: ThemeDefinition = {
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
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-surface': '#212121',
    'on-background': '#212121',
  },
}

/**
 * Dark theme definition.
 * Mirrors the light theme structure with appropriate dark-mode colors.
 */
const darkTheme: ThemeDefinition = {
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
    'on-primary': '#000000',
    'on-secondary': '#000000',
    'on-surface': '#EEEEEE',
    'on-background': '#EEEEEE',
  },
}

/**
 * Vuetify plugin instance with light and dark theme definitions.
 *
 * To customise the theme:
 * - Edit the color tokens in lightTheme / darkTheme above
 * - Add new themes by creating a `ThemeDefinition` and registering it
 *   in the `themes` map below
 *
 * Runtime toggling between themes is handled by the `useTheme` composable.
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
      light: lightTheme,
      dark: darkTheme,
    },
  },
})
