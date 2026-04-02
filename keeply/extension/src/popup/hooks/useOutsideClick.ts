import { useEffect, type RefObject } from 'react'

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  onOutsideClick: () => void,
): void {
  useEffect(() => {
    if (!isActive) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClick()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, isActive, onOutsideClick])
}
