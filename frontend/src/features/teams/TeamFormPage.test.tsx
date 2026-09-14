import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
    createTeam,
    getTeamById,
    updateTeam,
} from '../../api/teamsApi'
import { AuthContext } from '../../auth/AuthContext'
import { ApiError } from '../../api/apiError'
import { TeamFormPage } from './TeamFormPage'

vi.mock('../../api/teamsApi', () => ({
    createTeam: vi.fn(),
    getTeamById: vi.fn(),
    updateTeam: vi.fn(),
}))

const mockedCreateTeam = vi.mocked(createTeam)
const mockedGetTeamById = vi.mocked(getTeamById)
const mockedUpdateTeam = vi.mocked(updateTeam)

function renderPage(
    initialPath: string,
    hasAdministratorRole = true,
) {
    return render(
        <AuthContext.Provider
            value={{
                user: {
                    username: 'admin',
                    displayName: 'Administrator',
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
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route
                        path="/teams/new"
                        element={<TeamFormPage />}
                    />
                    <Route
                        path="/teams/:teamId/edit"
                        element={<TeamFormPage />}
                    />
                    <Route
                        path="/teams/:teamId"
                        element={<p>Team detail</p>}
                    />
                    <Route
                        path="/teams"
                        element={<p>Team list</p>}
                    />
                    <Route
                        path="/forbidden"
                        element={<p>Forbidden page</p>}
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

describe('TeamFormPage', () => {
    it('creates a team and redirects to its detail page', async () => {
        mockedCreateTeam.mockResolvedValue({
            id: 'team-1',
            name: 'Desert Riders',
            description: 'A relay racing team',
            coachName: 'Amina',
            status: 'ACTIVE',
            createdAt: '2026-09-13T12:00:00',
            victories: 0,
            defeats: 0,
            members: [],
        })

        renderPage('/teams/new')

        fireEvent.change(
            screen.getByLabelText('Team name'),
            {
                target: {
                    value: 'Desert Riders',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Coach name'),
            {
                target: {
                    value: 'Amina',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Description'),
            {
                target: {
                    value: 'A relay racing team',
                },
            },
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create team',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateTeam).toHaveBeenCalledWith({
                name: 'Desert Riders',
                description: 'A relay racing team',
                coachName: 'Amina',
            })
        })

        expect(
            await screen.findByText('Team detail'),
        ).toBeInTheDocument()
    })

    it('loads and updates a team', async () => {
        mockedGetTeamById.mockResolvedValue({
            id: 'team-1',
            name: 'Desert Riders',
            description: 'A relay racing team',
            coachName: 'Amina',
            status: 'ACTIVE',
            createdAt: '2026-09-13T12:00:00',
            victories: 0,
            defeats: 0,
            members: [],
        })

        mockedUpdateTeam.mockResolvedValue({
            id: 'team-1',
            name: 'Desert Riders Updated',
            description: 'Updated description',
            coachName: 'Amina',
            status: 'ACTIVE',
            createdAt: '2026-09-13T12:00:00',
            victories: 0,
            defeats: 0,
            members: [],
        })

        renderPage('/teams/team-1/edit')

        expect(
            await screen.findByDisplayValue('Desert Riders'),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Team name'),
            {
                target: {
                    value: 'Desert Riders Updated',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Description'),
            {
                target: {
                    value: 'Updated description',
                },
            },
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Save team changes',
            }),
        )

        await waitFor(() => {
            expect(mockedUpdateTeam).toHaveBeenCalledWith('team-1', {
                name: 'Desert Riders Updated',
                description: 'Updated description',
                coachName: 'Amina',
            })
        })

        expect(
            await screen.findByText('Team detail'),
        ).toBeInTheDocument()
    })

    it('shows backend validation errors', async () => {
        mockedCreateTeam.mockRejectedValue(
            new ApiError(
                'Invalid request',
                400,
                {
                    timestamp: '2026-09-13T12:00:00',
                    status: 400,
                    error: 'Bad Request',
                    message: 'Invalid request',
                    path: '/api/teams',
                    validationErrors: {
                        name: 'Team name is required',
                    },
                },
            ),
        )

        renderPage('/teams/new')

        fireEvent.change(
            screen.getByLabelText('Team name'),
            {
                target: {
                    value: 'Desert Riders',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Coach name'),
            {
                target: {
                    value: 'Amina',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Description'),
            {
                target: {
                    value: 'A relay racing team',
                },
            },
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create team',
            }),
        )

        expect(
            await screen.findByText('Team name is required'),
        ).toBeInTheDocument()
    })

    it('redirects non administrators to forbidden', async () => {
        renderPage('/teams/new', false)

        expect(
            await screen.findByText('Forbidden page'),
        ).toBeInTheDocument()
    })
})