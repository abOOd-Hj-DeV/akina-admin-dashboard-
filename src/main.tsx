import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.tsx'
import { purgeLegacyTokens } from './api/client'

// التوكنات لم تعد تُخزَّن في localStorage — احذف أي مفاتيح قديمة
purgeLegacyTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
