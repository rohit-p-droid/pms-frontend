import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement
    let effectiveTheme: 'light' | 'dark' = 'light'

    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    } else {
      effectiveTheme = theme
    }

    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    setResolvedTheme(effectiveTheme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      let next: Theme
      if (prev === 'light') {
        next = 'dark'
      } else if (prev === 'dark') {
        next = 'system'
      } else {
        next = 'light'
      }
      localStorage.setItem('theme', next)
      return next
    })
  }

  return { theme, resolvedTheme, toggleTheme, setTheme }
}
