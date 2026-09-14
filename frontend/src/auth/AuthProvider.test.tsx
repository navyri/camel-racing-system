import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from './AuthContext'

const keycloak = {
    authenticated: false,
    token: undefined as string | undefined,
    tokenParsed: undefined as
        | {
            realm_access?: {
                roles?: string[]
            }
            preferred_username?: string
            sub?: string
            name?: string
            email?: string
        }
        | undefined,
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    clearToken: vi.fn(),
    onAuthSuccess: undefined as (() => void) | undefined,
    onAuthRefreshSuccess: undefined as (() => void) | undefined,
    onAuthLogout: undefined as (() => void) | undefined,
    onTokenExpired: undefined as (() => void) | undefined,
}

vi.mock('./keycloak', () => ({
    keycloak,
}))

const { AuthProvider } = await import('./AuthProvider')

function AuthStateViewer() {
    return (
        <AuthContext.Consumer>
            {(value) => (
                <div>
                    <p>Initialized: {String(value?.initialized)}</p>
                    <p>Authenticated: {String(value?.authenticated)}</p>
                    <p>Username: {value?.user?.username ?? 'none'}</p>
                    <button
                        type="button"
                        onClick={() => void value?.login()}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => void value?.logout()}
                    >
                        Sign out
                    </button>
                </div>
            )}
        </AuthContext.Consumer>
    )
}

function renderProvider() {
    return render(
        <AuthProvider>
            <AuthStateViewer />
        </AuthProvider>,
    )
}

async function waitForProviderInitialization() {
    await act(async () => {
        await Promise.resolve()
    })
}

beforeEach(() => {
    vi.clearAllMocks()

    window.history.replaceState({}, '', '/')

    keycloak.authenticated = false
    keycloak.token = undefined
    keycloak.tokenParsed = undefined
    keycloak.onAuthSuccess = undefined
    keycloak.onAuthRefreshSuccess = undefined
    keycloak.onAuthLogout = undefined
    keycloak.onTokenExpired = undefined

    keycloak.init.mockResolvedValue(false)
    keycloak.login.mockResolvedValue(undefined)
    keycloak.logout.mockResolvedValue(undefined)
    keycloak.updateToken.mockResolvedValue(false)
})

describe('AuthProvider', () => {
    it('initializes unauthenticated state when Keycloak has no session', async () => {
        renderProvider()

        expect(screen.getByText('Initialized: false')).toBeInTheDocument()

        await waitForProviderInitialization()

        expect(screen.getByText('Initialized: true')).toBeInTheDocument()
        expect(screen.getByText('Authenticated: false')).toBeInTheDocument()
        expect(screen.getByText('Username: none')).toBeInTheDocument()

        expect(keycloak.init).toHaveBeenCalledWith({
            onLoad: 'check-sso',
            pkceMethod: 'S256',
            checkLoginIframe: false,
            redirectUri: 'http://localhost:3000/',
            silentCheckSsoRedirectUri: 'http://localhost:3000/silent-check-sso.html',
        })
    })

    it('preserves the current route during Keycloak initialization', async () => {
        window.history.replaceState(
            {},
            '',
            '/administration?section=overview#access',
        )

        renderProvider()

        await waitForProviderInitialization()

        expect(keycloak.init).toHaveBeenCalledWith({
            onLoad: 'check-sso',
            pkceMethod: 'S256',
            checkLoginIframe: false,
            redirectUri:
                'http://localhost:3000/administration?section=overview#access',
            silentCheckSsoRedirectUri: 'http://localhost:3000/silent-check-sso.html',
        })
    })

    it('maps authenticated Keycloak token data into application user state', async () => {
        keycloak.authenticated = true
        keycloak.token = 'access-token'
        keycloak.tokenParsed = {
            preferred_username: 'race-admin',
            name: 'Race Administrator',
            email: 'admin@camel-racing.test',
            realm_access: {
                roles: [
                    'ADMINISTRATOR',
                    'RACE_ORGANIZER',
                    'unrelated-role',
                ],
            },
        }

        renderProvider()

        await waitForProviderInitialization()

        expect(screen.getByText('Initialized: true')).toBeInTheDocument()
        expect(screen.getByText('Authenticated: true')).toBeInTheDocument()
        expect(screen.getByText('Username: race-admin')).toBeInTheDocument()
    })

    it('uses the full current url as login redirect uri', async () => {
        window.history.replaceState(
            {},
            '',
            '/administration?section=overview#access',
        )

        renderProvider()

        await waitForProviderInitialization()

        await act(async () => {
            screen.getByRole('button', {
                name: 'Sign in',
            }).click()
        })

        expect(keycloak.login).toHaveBeenCalledWith({
            redirectUri:
                'http://localhost:3000/administration?section=overview#access',
        })
    })

    it('uses the full current url as logout redirect uri', async () => {
        window.history.replaceState(
            {},
            '',
            '/races/race-id/registrations?view=team#pending',
        )

        renderProvider()

        await waitForProviderInitialization()

        await act(async () => {
            screen.getByRole('button', {
                name: 'Sign out',
            }).click()
        })

        expect(keycloak.logout).toHaveBeenCalledWith({
            redirectUri:
                'http://localhost:3000/races/race-id/registrations?view=team#pending',
        })
    })

    it('updates application state after a successful authentication callback', async () => {
        renderProvider()

        await waitForProviderInitialization()

        keycloak.authenticated = true
        keycloak.token = 'access-token'
        keycloak.tokenParsed = {
            preferred_username: 'race-viewer',
            name: 'Race Viewer',
            realm_access: {
                roles: ['VIEWER'],
            },
        }

        await act(async () => {
            keycloak.onAuthSuccess?.()
        })

        expect(screen.getByText('Authenticated: true')).toBeInTheDocument()
        expect(screen.getByText('Username: race-viewer')).toBeInTheDocument()
    })
})