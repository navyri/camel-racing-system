import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from './AuthContext'
import { RoleGuard } from './RoleGuard'

function renderRoleGuard(hasRole: boolean) {
    return render(
        <AuthContext.Provider
            value={{
                initialized: true,
                authenticated: true,
                user: {
                    username: 'admin',
                    displayName: 'Admin User',
                    roles: hasRole ? ['ADMIN'] : ['USER'],
                },
                login: async () => undefined,
                logout: async () => undefined,
                hasRole: (role) => hasRole && role === 'ADMIN',
            }}
        >
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <RoleGuard role="ADMIN">
                                <p>Administrative content</p>
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
    it('renders protected content when the user has the required role', () => {
        renderRoleGuard(true)

        expect(screen.getByText('Administrative content')).toBeInTheDocument()
    })

    it('redirects to forbidden when the user lacks the required role', () => {
        renderRoleGuard(false)

        expect(screen.getByText('Access denied')).toBeInTheDocument()
    })
})