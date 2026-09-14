import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from './AuthContext'
import { RoleGuard } from './RoleGuard'
import type { AppRole } from './authTypes'

function renderRoleGuard(
    initialized: boolean,
    authenticated: boolean,
    roles: AppRole[],
    allowedRoles: AppRole[],
) {
    return render(
        <AuthContext.Provider
            value={{
                initialized,
                authenticated,
                user: authenticated
                    ? {
                        username: 'race-user',
                        displayName: 'Race User',
                        roles,
                    }
                    : null,
                login: async () => undefined,
                logout: async () => undefined,
                hasRole: (role) => roles.includes(role as AppRole),
            }}
        >
            <MemoryRouter initialEntries={['/restricted']}>
                <Routes>
                    <Route
                        path="/restricted"
                        element={
                            <RoleGuard allowedRoles={allowedRoles}>
                                <p>Restricted content</p>
                            </RoleGuard>
                        }
                    />
                    <Route path="/forbidden" element={<p>Access denied</p>} />
                    <Route path="/login" element={<p>Login</p>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

describe('RoleGuard', () => {
    it('shows preparing access while the session is initializing', () => {
        renderRoleGuard(
            false,
            false,
            [],
            ['ADMINISTRATOR'],
        )

        expect(
            screen.getByRole('heading', {
                name: 'Preparing access',
            }),
        ).toBeInTheDocument()
        expect(screen.queryByText('Login')).not.toBeInTheDocument()
        expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
    })

    it('renders protected content for an administrator', () => {
        renderRoleGuard(
            true,
            true,
            ['ADMINISTRATOR'],
            ['ADMINISTRATOR', 'RACE_ORGANIZER'],
        )

        expect(screen.getByText('Restricted content')).toBeInTheDocument()
    })

    it('renders protected content for a race organizer', () => {
        renderRoleGuard(
            true,
            true,
            ['RACE_ORGANIZER'],
            ['ADMINISTRATOR', 'RACE_ORGANIZER'],
        )

        expect(screen.getByText('Restricted content')).toBeInTheDocument()
    })

    it('redirects a viewer to forbidden for a restricted route', () => {
        renderRoleGuard(
            true,
            true,
            ['VIEWER'],
            ['ADMINISTRATOR', 'RACE_ORGANIZER'],
        )

        expect(screen.getByText('Access denied')).toBeInTheDocument()
    })

    it('redirects an unauthenticated user to login', () => {
        renderRoleGuard(
            true,
            false,
            [],
            ['ADMINISTRATOR'],
        )

        expect(screen.getByText('Login')).toBeInTheDocument()
    })
})