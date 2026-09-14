import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { getAppRoles, type AuthState, type AuthUser } from './authTypes'
import { keycloak } from './keycloak'

function getUser(): AuthUser | null {
    const token = keycloak.tokenParsed

    if (!token || !keycloak.authenticated) {
        return null
    }

    const roles = getAppRoles(token.realm_access?.roles)
    const username =
        token.preferred_username ?? token.sub ?? 'unknown-account'
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

function getCurrentRedirectUri(): string {
    return window.location.href
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({
        initialized: false,
        authenticated: false,
        user: null,
    })
    const didInit = useRef(false)

    const refreshAuthState = useCallback(() => {
        const user = getUser()

        setAuthState({
            initialized: true,
            authenticated: user !== null,
            user,
        })
    }, [])

    useEffect(() => {
        if (didInit.current) {
            return
        }
        didInit.current = true

        void keycloak
            .init({
                onLoad: 'check-sso',
                pkceMethod: 'S256',
                checkLoginIframe: false,
                redirectUri: getCurrentRedirectUri(),
                silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            })
            .then(() => {
                refreshAuthState()
            })
            .catch(() => {
                setAuthState({
                    initialized: true,
                    authenticated: false,
                    user: null,
                })
            })

        keycloak.onAuthSuccess = refreshAuthState
        keycloak.onAuthRefreshSuccess = refreshAuthState
        keycloak.onAuthLogout = refreshAuthState
        keycloak.onTokenExpired = () => {
            void keycloak.updateToken(30).catch(() => {
                keycloak.clearToken()
                setAuthState({
                    initialized: true,
                    authenticated: false,
                    user: null,
                })
            })
        }
    }, [refreshAuthState])

    const login = useCallback(async () => {
        await keycloak.login({
            redirectUri: getCurrentRedirectUri(),
        })
    }, [])

    const logout = useCallback(async () => {
        await keycloak.logout({
            redirectUri: getCurrentRedirectUri(),
        })
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            ...authState,
            login,
            logout,
            hasRole: (role) =>
                authState.user?.roles.includes(role as never) ?? false,
        }),
        [authState, login, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}