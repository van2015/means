import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DesignMode } from './DesignMode'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <DesignMode />
  </StrictMode>,
)
