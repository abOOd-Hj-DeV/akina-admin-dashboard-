import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'
import type { ReactNode } from 'react'

export function installDom() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  return window
}

export function mount() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  return {
    container,
    render: async (next: ReactNode) => act(async () => { root.render(next) }),
    unmount: async () => {
      await act(async () => { root.unmount() })
      container.remove()
    },
  }
}
