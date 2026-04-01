import { computed } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'

/** localStorage key for persisting the selected theme. */
const THEME_STORAGE_KEY = 'fdsc-dashboard-theme'

/** Valid theme names supported by the application. */
export type ThemeName = 'light' | 'dark'

/**
 * Composable for toggling between light and dark themes.
 * Persists the user's choice in localStorage so it is
 * restored across sessions.
 *
 * @returns Reactive `isDark` computed ref, `toggleTheme` function, and `initTheme` function.
 */
export function useTheme() {
  const theme = useVuetifyTheme()

  /** Reactive boolean indicating whether the current theme is dark. */
  const isDark = computed(() => theme.global.current.value.dark)

  /** The current theme name as a reactive computed ref. */
  const currentTheme = computed<ThemeName>(() => (isDark.value ? 'dark' : 'light'))

  /**
   * Toggle between light and dark themes and persist the choice.
   */
  function toggleTheme(): void {
    const newTheme: ThemeName = isDark.value ? 'light' : 'dark'
    theme.global.name.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  /**
   * Set the theme to a specific value and persist the choice.
   *
   * @param name - The theme to activate.
   */
  function setTheme(name: ThemeName): void {
    theme.global.name.value = name
    localStorage.setItem(THEME_STORAGE_KEY, name)
  }

  /**
   * Restore the theme from localStorage if a previous choice exists.
   * Should be called once during application initialization.
   */
  function initTheme(): void {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      theme.global.name.value = saved
    }
  }

  return {
    isDark,
    currentTheme,
    toggleTheme,
    setTheme,
    initTheme,
  }
}
