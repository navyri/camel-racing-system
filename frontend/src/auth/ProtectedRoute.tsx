import { useContext, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import { LoadingState } from '../components/common/LoadingState'

interface ProtectedRouteProps {
    children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const auth = useContext(AuthContext)
    const location = useLocation()

    if (!auth || !auth.initialized) {
        return <LoadingState message="Checking your session..." />
    }

    if (!auth.authenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    return <>{children}</>
}