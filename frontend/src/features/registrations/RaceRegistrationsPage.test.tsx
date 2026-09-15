import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/apiError'
import { getCompetitors } from '../../api/competitorsApi'
import {
    approveRegistration,
    cancelRegistration,
    createRegistration,
    getRegistrationsByRaceId,
    rejectRegistration,
} from '../../api/registrationsApi'
import { getRaceById } from '../../api/racesApi'
import { getTeamById, getTeams } from '../../api/teamsApi'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthUser } from '../../auth/authTypes'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { RaceResponse } from '../races/raceTypes'
import type { TeamResponse, TeamSummaryResponse } from '../teams/teamTypes'
import { RaceRegistrationsPage } from './RaceRegistrationsPage'
import type { RegistrationResponse } from './registrationTypes'

vi.mock('../../api/competitorsApi', () => ({
    getCompetitors: vi.fn(),
}))

vi.mock('../../api/registrationsApi', () => ({
    approveRegistration: vi.fn(),
    cancelRegistration: vi.fn(),
    createRegistration: vi.fn(),
    getRegistrationsByRaceId: vi.fn(),
    rejectRegistration: vi.fn(),
}))

vi.mock('../../api/racesApi', () => ({
    getRaceById: vi.fn(),
}))

vi.mock('../../api/teamsApi', () => ({
    getTeamById: vi.fn(),
    getTeams: vi.fn(),
}))

const mockedGetCompetitors = vi.mocked(getCompetitors)
const mockedApproveRegistration = vi.mocked(approveRegistration)
const mockedCancelRegistration = vi.mocked(cancelRegistration)
const mockedCreateRegistration = vi.mocked(createRegistration)
const mockedGetRegistrationsByRaceId = vi.mocked(
    getRegistrationsByRaceId,
)
const mockedRejectRegistration = vi.mocked(rejectRegistration)
const mockedGetRaceById = vi.mocked(getRaceById)
const mockedGetTeamById = vi.mocked(getTeamById)
const mockedGetTeams = vi.mocked(getTeams)

const race: RaceResponse = {
    id: 'race-id',
    name: 'Desert Dawn Sprint',
    description: 'A sunrise individual camel race.',
    scheduledAt: '2026-10-01T08:00:00',
    startLocation: 'Oasis Gate',
    finishLocation: 'Dune Arch',
    distanceMeters: 1200,
    maxParticipants: 5,
    raceType: 'INDIVIDUAL',
    status: 'OPEN_FOR_REGISTRATION',
    organizerId: 'organizer-id',
    organizerUsername: 'organizer',
    registrationDeadline: '2026-09-30T08:00:00',
    createdAt: '2026-09-01T08:00:00',
    updatedAt: '2026-09-01T08:00:00',
}

const competitor: CompetitorResponse = {
    id: 'competitor-id',
    name: 'Byte',
    nickname: 'ByteTheCamel',
    competitorType: 'CAMEL',
    dateOfBirth: '2016-05-20',
    approximateAge: null,
    weightKg: 400,
    heightCm: 220,
    origin: 'Colombia',
    status: 'ACTIVE',
    registrationDate: '2026-09-01T08:00:00',
    victories: 0,
    defeats: 0,
    completedRaces: 0,
}

const teamSummary: TeamSummaryResponse = {
    id: 'team-id',
    name: 'Desert Riders',
    description: 'A relay racing team.',
    coachName: 'Amina',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00',
    victories: 0,
    defeats: 0,
}

const team: TeamResponse = {
    ...teamSummary,
    members: [
        {
            competitorId: competitor.id,
            name: competitor.name,
            nickname: competitor.nickname,
            competitorType: competitor.competitorType,
            joinedAt: '2026-09-01T08:00:00',
        },
    ],
}

const pendingRegistration: RegistrationResponse = {
    id: 'registration-id',
    raceId: race.id,
    competitorId: competitor.id,
    competitorName: competitor.name,
    competitorNickname: competitor.nickname,
    teamId: null,
    teamName: null,
    registeredAt: '2026-09-13T07:45:00',
    status: 'PENDING',
    startingPosition: null,
    validationNotes: null,
    registeredByUserId: 'organizer-id',
    registeredByUsername: 'organizer',
}

const organizerUser: AuthUser = {
    username: 'organizer',
    displayName: 'Race Organizer',
    roles: ['RACE_ORGANIZER'],
}

const nonOwnerOrganizerUser: AuthUser = {
    username: 'another-organizer',
    displayName: 'Another Organizer',
    roles: ['RACE_ORGANIZER'],
}

const viewerUser: AuthUser = {
    username: 'viewer',
    displayName: 'Race Viewer',
    roles: ['VIEWER'],
}

function createAuthContextValue(user: AuthUser) {
    return {
        initialized: true,
        authenticated: true,
        user,
        state: {
            initialized: true,
            authenticated: true,
            user,
        },
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: (role: string) =>
            user.roles.includes(role as AuthUser['roles'][number]),
        hasAnyRole: (roles: string[]) =>
            roles.some((role) =>
                user.roles.includes(role as AuthUser['roles'][number]),
            ),
    }
}

function createCompetitorsResponse(
    content: CompetitorResponse[] = [competitor],
) {
    return {
        content,
        page: 0,
        size: 100,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
        first: true,
        last: true,
        empty: content.length === 0,
    }
}

function createTeamsResponse(
    content: TeamSummaryResponse[] = [teamSummary],
) {
    return {
        content,
        page: 0,
        size: 100,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
        first: true,
        last: true,
    }
}

function renderPage(
    overrides: Partial<{
        user: AuthUser
        route: string
    }> = {},
) {
    const user = overrides.user ?? organizerUser
    const route =
        overrides.route ?? `/races/${race.id}/registrations`

    return render(
        <AuthContext.Provider value={createAuthContextValue(user)}>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route
                        path="/races/:raceId/registrations"
                        element={<RaceRegistrationsPage />}
                    />
                    <Route
                        path="/races/:raceId"
                        element={<div>Race detail</div>}
                    />
                    <Route
                        path="/registrations"
                        element={<div>Registration center</div>}
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

function setupSuccessfulLoad(
    registrations: RegistrationResponse[] = [pendingRegistration],
    raceResponse: RaceResponse = race,
) {
    mockedGetRaceById.mockResolvedValueOnce(raceResponse)
    mockedGetRegistrationsByRaceId.mockResolvedValueOnce(registrations)

    if (
        raceResponse.raceType === 'INDIVIDUAL' ||
        raceResponse.raceType === 'MIXED'
    ) {
        mockedGetCompetitors.mockResolvedValueOnce(createCompetitorsResponse())
    }

    if (
        raceResponse.raceType === 'TEAM' ||
        raceResponse.raceType === 'MIXED'
    ) {
        mockedGetTeams.mockResolvedValueOnce(createTeamsResponse())
        mockedGetTeamById.mockResolvedValueOnce(team)
    }
}

describe('RaceRegistrationsPage', () => {
    it('loads race, registrations and active competitors for owner organizer', async () => {
        setupSuccessfulLoad()

        renderPage()

        expect(
            screen.getByText('Loading race registrations...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', {
                name: 'Race registrations',
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /Manage participant registrations for Desert Dawn Sprint\./,
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('0 of 5')).toBeInTheDocument()
        expect(screen.getByText('Byte (ByteTheCamel)')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('Not assigned')).toBeInTheDocument()
        expect(screen.getByText('Approve')).toBeInTheDocument()
        expect(screen.getByText('Reject')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()

        expect(mockedGetRaceById).toHaveBeenCalledWith(race.id)
        expect(mockedGetRegistrationsByRaceId).toHaveBeenCalledWith(race.id)
        expect(mockedGetCompetitors).toHaveBeenCalledWith({
            status: 'ACTIVE',
            page: 0,
            size: 100,
            sort: 'name,asc',
        })
        expect(mockedGetTeams).not.toHaveBeenCalled()
    })

    it('loads eligible active teams for an owner organizer team race', async () => {
        const teamRace: RaceResponse = {
            ...race,
            raceType: 'TEAM',
        }

        setupSuccessfulLoad([], teamRace)

        renderPage()

        expect(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        ).toBeInTheDocument()

        expect(mockedGetCompetitors).not.toHaveBeenCalled()
        expect(mockedGetTeams).toHaveBeenCalledWith({
            status: 'ACTIVE',
            page: 0,
            size: 100,
            sort: 'name,asc',
        })
        expect(mockedGetTeamById).toHaveBeenCalledWith(team.id)
    })

    it('does not offer active teams without active members', async () => {
        const teamRace: RaceResponse = {
            ...race,
            raceType: 'TEAM',
        }

        setupSuccessfulLoad([], teamRace)
        mockedGetTeamById.mockReset()
        mockedGetTeamById.mockResolvedValueOnce({
            ...team,
            members: [],
        })

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Register team participant',
        })

        expect(
            within(dialog).queryByRole('option', {
                name: 'Desert Riders',
            }),
        ).not.toBeInTheDocument()
    })

    it('links to registration center and race detail', async () => {
        setupSuccessfulLoad()

        renderPage()

        expect(
            await screen.findByRole('link', {
                name: 'Return to registrations',
            }),
        ).toHaveAttribute('href', '/registrations')

        expect(
            screen.getByRole('link', {
                name: 'Return to race',
            }),
        ).toHaveAttribute('href', `/races/${race.id}`)
    })

    it('opens registration creation dialog and returns focus after cancellation', async () => {
        setupSuccessfulLoad([])

        renderPage()

        const registerButton = await screen.findByRole('button', {
            name: 'Register participant',
        })

        registerButton.focus()
        fireEvent.click(registerButton)

        expect(
            screen.getByRole('dialog', {
                name: 'Register individual participant',
            }),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Competitor')).toHaveFocus()

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        expect(registerButton).toHaveFocus()
    })

    it('opens a team registration dialog for team races', async () => {
        const teamRace: RaceResponse = {
            ...race,
            raceType: 'TEAM',
        }

        setupSuccessfulLoad([], teamRace)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Register team participant',
        })

        expect(
            within(dialog).getByRole('combobox', {
                name: 'Team',
            }),
        ).toHaveFocus()
        expect(
            within(dialog).queryByLabelText('Competitor'),
        ).not.toBeInTheDocument()
    })

    it('shows participant mode choices for mixed races', async () => {
        const mixedRace: RaceResponse = {
            ...race,
            raceType: 'MIXED',
        }

        setupSuccessfulLoad([], mixedRace)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Register race participant',
        })

        expect(
            within(dialog).getByRole('group', {
                name: 'Participant type',
            }),
        ).toBeInTheDocument()
        expect(
            within(dialog).getByRole('radio', {
                name: 'Individual competitor',
            }),
        ).toBeChecked()

        fireEvent.click(
            within(dialog).getByRole('radio', {
                name: 'Team',
            }),
        )

        expect(
            within(dialog).getByRole('combobox', {
                name: 'Team',
            }),
        ).toHaveFocus()
    })

    it('shows feedback dialog after creating an individual registration', async () => {
        setupSuccessfulLoad([])

        mockedCreateRegistration.mockResolvedValueOnce({
            ...pendingRegistration,
            id: 'created-registration-id',
        })

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const createDialog = screen.getByRole('dialog', {
            name: 'Register individual participant',
        })

        fireEvent.change(within(createDialog).getByLabelText('Competitor'), {
            target: {
                value: competitor.id,
            },
        })
        fireEvent.click(
            within(createDialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateRegistration).toHaveBeenCalledWith(race.id, {
                competitorId: competitor.id,
                teamId: null,
                startingPosition: null,
            })
        })

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration created',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Participant registration was created successfully.',
            ),
        ).toBeInTheDocument()
    })

    it('creates a team registration with the required request body', async () => {
        const teamRace: RaceResponse = {
            ...race,
            raceType: 'TEAM',
        }
        const teamRegistration: RegistrationResponse = {
            ...pendingRegistration,
            id: 'team-registration-id',
            competitorId: null,
            competitorName: null,
            competitorNickname: null,
            teamId: team.id,
            teamName: team.name,
        }

        setupSuccessfulLoad([], teamRace)
        mockedCreateRegistration.mockResolvedValueOnce(teamRegistration)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Register team participant',
        })

        fireEvent.change(
            within(dialog).getByRole('combobox', {
                name: 'Team',
            }),
            {
                target: {
                    value: team.id,
                },
            },
        )
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateRegistration).toHaveBeenCalledWith(teamRace.id, {
                competitorId: null,
                teamId: team.id,
                startingPosition: null,
            })
        })

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration created',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Participant registration was created successfully.',
            ),
        ).toBeInTheDocument()
    })

    it('creates a team registration from mixed race mode', async () => {
        const mixedRace: RaceResponse = {
            ...race,
            raceType: 'MIXED',
        }
        const teamRegistration: RegistrationResponse = {
            ...pendingRegistration,
            id: 'mixed-team-registration-id',
            competitorId: null,
            competitorName: null,
            competitorNickname: null,
            teamId: team.id,
            teamName: team.name,
        }

        setupSuccessfulLoad([], mixedRace)
        mockedCreateRegistration.mockResolvedValueOnce(teamRegistration)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Register race participant',
        })

        fireEvent.click(
            within(dialog).getByRole('radio', {
                name: 'Team',
            }),
        )
        fireEvent.change(
            within(dialog).getByRole('combobox', {
                name: 'Team',
            }),
            {
                target: {
                    value: team.id,
                },
            },
        )
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateRegistration).toHaveBeenCalledWith(mixedRace.id, {
                competitorId: null,
                teamId: team.id,
                startingPosition: null,
            })
        })

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration created',
            }),
        ).toBeInTheDocument()
    })

    it('shows feedback dialog after approving a registration', async () => {
        setupSuccessfulLoad()

        mockedApproveRegistration.mockResolvedValueOnce({
            ...pendingRegistration,
            status: 'APPROVED',
            startingPosition: 1,
        })

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Approve',
            }),
        )
        fireEvent.change(screen.getByLabelText('Starting position'), {
            target: {
                value: '1',
            },
        })
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Approve registration',
            }),
        )

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration approved',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Registration was approved successfully.'),
        ).toBeInTheDocument()
    })

    it('shows the empty state when the race has no registrations', async () => {
        setupSuccessfulLoad([])

        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'No registrations found',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'No participants have been registered for this race yet.',
            ),
        ).toBeInTheDocument()
    })

    it('shows a retry action when initial loading fails', async () => {
        mockedGetRaceById.mockRejectedValueOnce(
            new ApiError('Race service unavailable', 503),
        )
        mockedGetRegistrationsByRaceId.mockResolvedValueOnce([])

        renderPage()

        expect(
            await screen.findByText(
                'The registration service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        mockedGetRaceById.mockResolvedValueOnce(race)
        mockedGetRegistrationsByRaceId.mockResolvedValueOnce([])
        mockedGetCompetitors.mockResolvedValueOnce(createCompetitorsResponse())

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(
            await screen.findByRole('heading', {
                name: 'Race registrations',
            }),
        ).toBeInTheDocument()
    })

    it('shows read-only access and hides management actions for a viewer', async () => {
        setupSuccessfulLoad()

        renderPage({
            user: viewerUser,
        })

        expect(
            await screen.findByRole('heading', {
                name: 'Read-only access',
            }),
        ).toBeInTheDocument()

        expect(
            screen.queryByRole('button', {
                name: 'Register participant',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Approve',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Reject',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Cancel',
            }),
        ).not.toBeInTheDocument()
        expect(screen.getByText('Read only')).toBeInTheDocument()
        expect(mockedGetCompetitors).not.toHaveBeenCalled()
        expect(mockedGetTeams).not.toHaveBeenCalled()
    })

    it('shows read-only access and hides management actions for non-owner organizer', async () => {
        setupSuccessfulLoad()

        renderPage({
            user: nonOwnerOrganizerUser,
        })

        expect(
            await screen.findByRole('heading', {
                name: 'Read-only access',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'Race registrations',
            }),
        ).toBeInTheDocument()
        expect(screen.getByText('Byte (ByteTheCamel)')).toBeInTheDocument()

        expect(
            screen.getByRole('link', {
                name: 'Return to registrations',
            }),
        ).toHaveAttribute('href', '/registrations')
        expect(
            screen.getByRole('link', {
                name: 'Return to race',
            }),
        ).toHaveAttribute('href', `/races/${race.id}`)

        expect(
            screen.queryByRole('button', {
                name: 'Register participant',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Approve',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Reject',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Cancel',
            }),
        ).not.toBeInTheDocument()
        expect(screen.getByText('Read only')).toBeInTheDocument()
        expect(mockedGetCompetitors).not.toHaveBeenCalled()
        expect(mockedGetTeams).not.toHaveBeenCalled()
        expect(mockedGetRaceById).toHaveBeenCalledWith(race.id)
        expect(mockedGetRegistrationsByRaceId).toHaveBeenCalledWith(race.id)
    })

    it('shows registration creation action for a team race', async () => {
        setupSuccessfulLoad([], {
            ...race,
            raceType: 'TEAM',
        })

        renderPage()

        expect(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('heading', {
                name: 'New registrations unavailable',
            }),
        ).not.toBeInTheDocument()
    })

    it('shows no creation action while registration is closed', async () => {
        setupSuccessfulLoad([], {
            ...race,
            status: 'CLOSED_FOR_REGISTRATION',
        })

        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'New registrations unavailable',
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Register participant',
            }),
        ).not.toBeInTheDocument()
    })

    it('hides cancellation actions while registration is closed', async () => {
        const closedRace: RaceResponse = {
            ...race,
            status: 'CLOSED_FOR_REGISTRATION',
        }

        const approvedRegistration: RegistrationResponse = {
            ...pendingRegistration,
            status: 'APPROVED',
            startingPosition: 1,
        }

        setupSuccessfulLoad([approvedRegistration], closedRace)

        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'New registrations unavailable',
            }),
        ).toBeInTheDocument()

        expect(
            screen.queryByRole('button', {
                name: 'Cancel',
            }),
        ).not.toBeInTheDocument()

        expect(
            screen.getByText('No actions available'),
        ).toBeInTheDocument()

        expect(mockedCancelRegistration).not.toHaveBeenCalled()
    })

    it('validates required registration form values before submitting', async () => {
        setupSuccessfulLoad([])

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const createDialog = screen.getByRole('dialog', {
            name: 'Register individual participant',
        })

        fireEvent.submit(
            within(createDialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        expect(
            within(createDialog).getByText(
                'Review the highlighted fields before saving the registration.',
            ),
        ).toBeInTheDocument()
        expect(
            within(createDialog).getByText('Competitor is required'),
        ).toBeInTheDocument()
        expect(mockedCreateRegistration).not.toHaveBeenCalled()
    })

    it('validates required team values before submitting', async () => {
        const teamRace: RaceResponse = {
            ...race,
            raceType: 'TEAM',
        }

        setupSuccessfulLoad([], teamRace)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const createDialog = screen.getByRole('dialog', {
            name: 'Register team participant',
        })

        fireEvent.submit(
            within(createDialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        expect(
            within(createDialog).getByText('Team is required'),
        ).toBeInTheDocument()
        expect(mockedCreateRegistration).not.toHaveBeenCalled()
    })

    it('shows conflicts returned while creating a registration', async () => {
        setupSuccessfulLoad([])

        mockedCreateRegistration.mockRejectedValueOnce(
            new ApiError('Competitor is already registered in this race', 409),
        )

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Register participant',
            }),
        )

        const createDialog = screen.getByRole('dialog', {
            name: 'Register individual participant',
        })

        fireEvent.change(within(createDialog).getByLabelText('Competitor'), {
            target: {
                value: competitor.id,
            },
        })
        fireEvent.click(
            within(createDialog).getByRole('button', {
                name: 'Register participant',
            }),
        )

        expect(
            await within(createDialog).findByText(
                'Competitor is already registered in this race',
            ),
        ).toBeInTheDocument()
    })

    it('requires starting position before approving a registration', async () => {
        setupSuccessfulLoad()

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Approve',
            }),
        )

        expect(
            screen.getByRole('dialog', {
                name: 'Approve registration',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Starting position'),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Approve registration',
            }),
        )

        expect(
            screen.getByText('Starting position is required'),
        ).toBeInTheDocument()
        expect(mockedApproveRegistration).not.toHaveBeenCalled()
    })

    it('shows only positions not assigned to approved registrations', async () => {
        const approvedRegistration: RegistrationResponse = {
            ...pendingRegistration,
            id: 'approved-registration-id',
            status: 'APPROVED',
            startingPosition: 2,
        }

        setupSuccessfulLoad([
            pendingRegistration,
            approvedRegistration,
        ])

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Approve',
            }),
        )

        expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument()
        expect(
            screen.queryByRole('option', { name: '2' }),
        ).not.toBeInTheDocument()
        expect(screen.getByRole('option', { name: '3' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: '4' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: '5' })).toBeInTheDocument()
    })

    it('shows an approval notice without opening a dialog when capacity is full', async () => {
        const fullRace: RaceResponse = {
            ...race,
            maxParticipants: 2,
        }
        const approvedRegistrationOne: RegistrationResponse = {
            ...pendingRegistration,
            id: 'approved-registration-one',
            status: 'APPROVED',
            startingPosition: 1,
        }
        const approvedRegistrationTwo: RegistrationResponse = {
            ...pendingRegistration,
            id: 'approved-registration-two',
            status: 'APPROVED',
            startingPosition: 2,
        }

        setupSuccessfulLoad(
            [
                pendingRegistration,
                approvedRegistrationOne,
                approvedRegistrationTwo,
            ],
            fullRace,
        )

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Approve',
            }),
        )

        expect(
            screen.queryByRole('dialog', {
                name: 'Approve registration',
            }),
        ).not.toBeInTheDocument()
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Race capacity has been reached. Reject or cancel an approved registration before approving another participant.',
        )
        expect(mockedApproveRegistration).not.toHaveBeenCalled()
    })

    it('shows approval conflicts inside the open dialog', async () => {
        setupSuccessfulLoad()

        mockedApproveRegistration.mockRejectedValueOnce(
            new ApiError('Race capacity has been reached', 409),
        )

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Approve',
            }),
        )
        fireEvent.change(screen.getByLabelText('Starting position'), {
            target: {
                value: '1',
            },
        })
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Approve registration',
            }),
        )

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent(
            'Race capacity has been reached',
        )
    })

    it('shows feedback dialog after rejecting a registration', async () => {
        setupSuccessfulLoad()

        mockedRejectRegistration.mockResolvedValueOnce({
            ...pendingRegistration,
            status: 'REJECTED',
            validationNotes: 'Medical document is missing.',
        })

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Reject',
            }),
        )
        fireEvent.change(screen.getByLabelText('Rejection reason'), {
            target: {
                value: 'Medical document is missing.',
            },
        })
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        )

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration rejected',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Registration was rejected successfully.'),
        ).toBeInTheDocument()
    })

    it('shows feedback dialog after cancelling a pending registration', async () => {
        setupSuccessfulLoad()

        mockedCancelRegistration.mockResolvedValueOnce(undefined)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Cancel',
            }),
        )
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cancel registration',
            }),
        )

        expect(
            await screen.findByRole('dialog', {
                name: 'Registration cancelled',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Registration was cancelled successfully.'),
        ).toBeInTheDocument()
    })
})