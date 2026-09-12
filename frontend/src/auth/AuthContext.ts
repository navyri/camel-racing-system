import { createContext } from 'react'
import type { AuthState } from './authTypes'

export interface AuthContextValue extends AuthState {
    login: () => Promise<void>
    logout: () => Promise<void>
    hasRole: (role: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)