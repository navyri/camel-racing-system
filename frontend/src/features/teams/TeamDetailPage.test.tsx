import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import {
    addTeamMember,
    deactivateTeam,
    getTeamById,
    removeTeamMember,
} from '../../api/teamsApi'
import { getCompetitors } from '../../api/competitorsApi'
import { AuthContext } from '../../auth/AuthContext'
import { TeamDetailPage } from './TeamDetailPage'

vi.mock('../../api/teamsApi', () => ({
    addTeamMember: vi.fn(),
    deactivateTeam: vi.fn(),
    getTeamById: vi.fn(),
    removeTeamMember: vi.fn(),
}))

vi.mock('../../api/competitorsApi', () => ({
    getCompetitors: vi.fn(),
}))

const mockedAddTeamMember = vi.mocked(addTeamMember)
const mockedDeactivateTeam = vi.mocked(deactivateTeam)
const mockedGetCompetitors = vi.mocked(getCompetitors)
const mockedGetTeamById = vi.mocked(getTeamById)
const mockedRemoveTeamMember = vi.mocked(removeTeamMember)

const team = {
    id: 'team-1',
    name: 'Desert Riders',
    description: 'A relay racing team',
    coachName: 'Amina',
    status: 'ACTIVE' as const,
    createdAt: '2026-09-13T12:00:00',
    victories: 3,
    defeats: 1,
    members: [
        {
            competitorId: 'competitor-1',
            name: 'Sand Runner',
            nickname: 'Runner',
            competitorType: 'CAMEL',
            joinedAt: '2026-09-13T12:00:00',
        },
    ],
}

function renderPage(hasAdministratorRole = true) {
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
            <MemoryRouter initialEntries={['/teams/team-1']}>
                <Routes>
                    <Route
                        path="/teams/:teamId"
                        element={<TeamDetailPage />}
                    />
                    <Route
                        path="/teams"
                        element={<p>Team list</p>}
                    />
                    <Route
                        path="/teams/:teamId/edit"
                        element={<p>Edit team</p>}
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

describe('TeamDetailPage', () => {
    beforeEach(() => {
        mockedAddTeamMember.mockReset()
        mockedDeactivateTeam.mockReset()
        mockedGetCompetitors.mockReset()
        mockedGetTeamById.mockReset()
        mockedRemoveTeamMember.mockReset()

        mockedGetTeamById.mockResolvedValue(team)
        mockedGetCompetitors.mockResolvedValue({
            content: [
                {
                    id: 'competitor-2',
                    name: 'Moon Walker',
                    nickname: 'Moon',
                    competitorType: 'CAMEL',
                    dateOfBirth: '2020-01-01',
                    approximateAge: 6,
                    weightKg: 550,
                    heightCm: 190,
                    origin: 'Desert',
                    status: 'ACTIVE',
                    registrationDate: '2026-01-01T12:00:00',
                    victories: 0,
                    defeats: 0,
                    completedRaces: 0,
                },
            ],
            page: 0,
            size: 100,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            empty: false,
        })
    })

    it('loads and displays the team detail', async () => {
        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'Desert Riders',
            }),
        ).toBeInTheDocument()

        expect(screen.getByText('Amina')).toBeInTheDocument()
        expect(screen.getByText('Sand Runner')).toBeInTheDocument()
        expect(
            screen.getByText('3 victories - 1 defeats'),
        ).toBeInTheDocument()
    })

    it('shows management controls for administrators', async () => {
        renderPage()

        expect(
            await screen.findByRole('button', {
                name: 'Add member',
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('link', {
                name: 'Edit team',
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', {
                name: 'Deactivate team',
            }),
        ).toBeInTheDocument()
    })

    it('shows read only access for viewers', async () => {
        renderPage(false)

        expect(
            await screen.findByText(
                'Read-only access. Only administrators can manage team records and memberships.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.queryByRole('button', {
                name: 'Add member',
            }),
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('link', {
                name: 'Edit team',
            }),
        ).not.toBeInTheDocument()
    })

    it('adds an available active competitor', async () => {
        mockedAddTeamMember.mockResolvedValue({
            ...team,
            members: [
                ...team.members,
                {
                    competitorId: 'competitor-2',
                    name: 'Moon Walker',
                    nickname: 'Moon',
                    competitorType: 'CAMEL',
                    joinedAt: '2026-09-13T14:00:00',
                },
            ],
        })

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Add member',
            }),
        )

        const dialog = await screen.findByRole('dialog')

        fireEvent.change(
            within(dialog).getByLabelText('Active competitor'),
            {
                target: {
                    value: 'competitor-2',
                },
            },
        )

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Add member',
            }),
        )

        await waitFor(() => {
            expect(mockedAddTeamMember).toHaveBeenCalledWith(
                'team-1',
                'competitor-2',
            )
        })

        expect(
            await screen.findByText('Moon Walker'),
        ).toBeInTheDocument()
    })

    it('opens confirmation before removing a member', async () => {
        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Remove member',
            }),
        )

        expect(
            screen.getByRole('dialog'),
        ).toHaveTextContent(
            'Remove Sand Runner from Desert Riders?',
        )
    })

    it('removes a member after confirmation', async () => {
        mockedRemoveTeamMember.mockResolvedValue(undefined)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Remove member',
            }),
        )

        const dialog = await screen.findByRole('dialog')

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Remove member',
            }),
        )

        await waitFor(() => {
            expect(mockedRemoveTeamMember).toHaveBeenCalledWith(
                'team-1',
                'competitor-1',
            )
        })

        await waitFor(() => {
            expect(
                screen.queryByText('Sand Runner'),
            ).not.toBeInTheDocument()
        })
    })

    it('deactivates a team after confirmation', async () => {
        mockedDeactivateTeam.mockResolvedValue(undefined)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Deactivate team',
            }),
        )

        const dialog = await screen.findByRole('dialog')

        expect(dialog).toHaveTextContent(
            'Deactivate Desert Riders?',
        )

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Deactivate team',
            }),
        )

        await waitFor(() => {
            expect(mockedDeactivateTeam).toHaveBeenCalledWith('team-1')
        })

        expect(
            await screen.findByText('Team list'),
        ).toBeInTheDocument()
    })
})