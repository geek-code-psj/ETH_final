import { useState, useEffect } from 'react'

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial }
    catch { return initial }
  })
  const set = (v) => { setValue(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }
  return [value, set]
}
