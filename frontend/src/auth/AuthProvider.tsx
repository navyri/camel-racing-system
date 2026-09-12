import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { getAppRoles, type AuthState, type AuthUser } from './authTypes'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { keycloak } from './keycloak'

function getUser(): AuthUser | null {
    const token = keycloak.tokenParsed

    if (!token || !keycloak.authenticated) {
        return null
    }

    const roles = getAppRoles(token.realm_access?.roles)
    const username = token.preferred_username ?? token.sub ?? 'user'
    const displayName = token.name ?? username
    const email = token.email

    return {
        username,
        displayName,
        email,
        roles,
    }
}

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({
        initialized: false,
        authenticated: false,
        user: null,
    })

    const refreshAuthState = useCallback(() => {
        const user = getUser()

        setAuthState({
            initialized: true,
            authenticated: user !== null,
            user,
        })
    }, [])

    useEffect(() => {
        let mounted = true

        void keycloak
            .init({
                onLoad: 'check-sso',
                pkceMethod: 'S256',
                checkLoginIframe: false,
            })
            .then(() => {
                if (mounted) {
                    refreshAuthState()
                }
            })
            .catch(() => {
                if (mounted) {
                    setAuthState({
                        initialized: true,
                        authenticated: false,
                        user: null,
                    })
                }
            })

        keycloak.onAuthSuccess = refreshAuthState
        keycloak.onAuthRefreshSuccess = refreshAuthState
        keycloak.onAuthLogout = refreshAuthState
        keycloak.onTokenExpired = () => {
            void keycloak.updateToken(30).catch(() => {
                keycloak.clearToken()

                if (mounted) {
                    setAuthState({
                        initialized: true,
                        authenticated: false,
                        user: null,
                    })
                }
            })
        }

        return () => {
            mounted = false
            keycloak.onAuthSuccess = undefined
            keycloak.onAuthRefreshSuccess = undefined
            keycloak.onAuthLogout = undefined
            keycloak.onTokenExpired = undefined
        }
    }, [refreshAuthState])

    const login = useCallback(async () => {
        await keycloak.login({
            redirectUri: window.location.origin,
        })
    }, [])

    const logout = useCallback(async () => {
        await keycloak.logout({
            redirectUri: window.location.origin,
        })
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            ...authState,
            login,
            logout,
            hasRole: (role) => authState.user?.roles.includes(role as never) ?? false,
        }),
        [authState, login, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}