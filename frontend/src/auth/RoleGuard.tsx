import { useContext, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from './AuthContext'

interface RoleGuardProps {
    role: string
    children: ReactNode
}

export function RoleGuard({ role, children }: RoleGuardProps) {
    const auth = useContext(AuthContext)

    if (!auth?.authenticated) {
        return <Navigate to="/login" replace />
    }

    if (!auth.hasRole(role)) {
        return <Navigate to="/forbidden" replace />
    }

    return <>{children}</>
}