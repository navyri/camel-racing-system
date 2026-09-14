import { useContext, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import type { AppRole } from './authTypes'

interface RoleGuardProps {
    allowedRoles: AppRole[]
    children: ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const auth = useContext(AuthContext)

    if (!auth?.initialized) {
        return (
            <main className="status-page">
                <section className="state-card">
                    <p className="eyebrow">Session check</p>
                    <h1>Preparing access</h1>
                    <p>
                        Confirming your racing registry session.
                    </p>
                </section>
            </main>
        )
    }

    if (!auth.authenticated) {
        return <Navigate to="/login" replace />
    }

    if (!allowedRoles.some((role) => auth.hasRole(role))) {
        return <Navigate to="/forbidden" replace />
    }

    return <>{children}</>
}