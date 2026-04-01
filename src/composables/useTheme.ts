import { useTheme as useVuetifyTheme } from 'vuetify'

/** localStorage key for persisting the selected theme. */
const THEME_STORAGE_KEY = 'fdsc-dashboard-theme'

/**
 * Composable for toggling between light and dark themes.
 * Persists the user's choice in localStorage.
 */
export function useTheme() {
  const theme = useVuetifyTheme()

  /** Whether the current theme is dark. */
  const isDark = () => theme.global.current.value.dark

  /** Toggle between light and dark themes. */
  function toggleTheme() {
    const newTheme = isDark() ? 'light' : 'dark'
    theme.global.name.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  /** Restore the theme from localStorage if available. */
  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      theme.global.name.value = saved
    }
  }

  return {
    isDark,
    toggleTheme,
    initTheme,
  }
}
