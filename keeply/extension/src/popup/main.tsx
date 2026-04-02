import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './popup.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV) {
  import('@/shared/utils/usageUtils').then(({ resetUsageForDev }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).keeplyResetUsage = resetUsageForDev
  })
}
