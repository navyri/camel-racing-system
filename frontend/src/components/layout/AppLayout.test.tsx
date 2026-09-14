import {
    render,
    screen,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../auth/AuthContext'
import { AppLayout } from './AppLayout'

vi.mock('./UserSessionPanel', () => ({
    UserSessionPanel: () => <p>User session</p>,
}))

function renderLayout(hasAdministratorRole: boolean) {
    return render(
        <AuthContext.Provider
            value={{
                user: {
                    username: hasAdministratorRole
                        ? 'admin'
                        : 'viewer',
                    displayName: hasAdministratorRole
                        ? 'Administrator'
                        : 'Viewer',
                    roles: hasAdministratorRole
                        ? ['ADMINISTRATOR']
                        : ['VIEWER'],
                },
                initialized: true,
                authenticated: true,
                hasRole: (role) =>
                    hasAdministratorRole &&
                    role === 'ADMINISTRATOR',
                login: vi.fn(),
                logout: vi.fn(),
            }}
        >
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

function getNavigationLinks() {
    return screen
        .getAllByRole('link')
        .filter((link) => link.closest('nav') !== null)
}

describe('AppLayout', () => {
    it('shows navigation links in the expected non administrator order', () => {
        renderLayout(false)

        expect(getNavigationLinks().map((link) => link.textContent)).toEqual([
            'Home',
            'Competitors',
            'Teams',
            'Races',
            'Registrations',
        ])
    })

    it('shows navigation links in the expected administrator order', () => {
        renderLayout(true)

        expect(getNavigationLinks().map((link) => link.textContent)).toEqual([
            'Home',
            'Competitors',
            'Teams',
            'Races',
            'Registrations',
            'Administration',
        ])
    })

    it('shows the teams navigation link', () => {
        renderLayout(false)

        expect(
            screen.getByRole('link', {
                name: 'Teams',
            }),
        ).toHaveAttribute('href', '/teams')
    })

    it('shows registrations navigation link', () => {
        renderLayout(false)

        expect(
            screen.getByRole('link', {
                name: 'Registrations',
            }),
        ).toHaveAttribute('href', '/registrations')
    })

    it('shows administration to administrators', () => {
        renderLayout(true)

        expect(
            screen.getByRole('link', {
                name: 'Administration',
            }),
        ).toHaveAttribute('href', '/administration')
    })

    it('hides administration from non administrators', () => {
        renderLayout(false)

        expect(
            screen.queryByRole('link', {
                name: 'Administration',
            }),
        ).not.toBeInTheDocument()
    })
})