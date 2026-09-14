import { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { LoadingState } from '../components/common/LoadingState'

interface LoginLocationState {
    from?: string
}

export function LoginPage() {
    const auth = useContext(AuthContext)
    const location = useLocation()
    const state = location.state as LoginLocationState | null

    if (!auth || !auth.initialized) {
        return <LoadingState message="Preparing sign in..." />
    }

    if (auth.authenticated) {
        return <Navigate to={state?.from ?? '/'} replace />
    }

    return (
        <section className="auth-card">
            <p className="eyebrow">Camel Racing System</p>
            <h1>Sign in to continue</h1>
            <p>
                Use your Keycloak account to access protected race management features.
            </p>
            <button type="button" onClick={() => void auth.login()}>
                Sign in
            </button>
        </section>
    )
}