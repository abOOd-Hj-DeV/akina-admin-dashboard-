import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role } from '../types'

interface AuthState {
  role: Role | null
  login: (role: Role) => void
  logout: () => void
}

const Ctx = createContext<AuthState>({ role: null, login: () => {}, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const s = sessionStorage.getItem('sakina-role')
    return (s as Role) || null
  })
  const login = (r: Role) => {
    sessionStorage.setItem('sakina-role', r)
    setRole(r)
  }
  const logout = () => {
    sessionStorage.removeItem('sakina-role')
    setRole(null)
  }
  return <Ctx.Provider value={{ role, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
