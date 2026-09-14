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
import { getRegistrationsByRaceId } from '../../api/registrationsApi'
import { getRaceById } from '../../api/racesApi'
import {
    createResult,
    getResultsByRaceId,
    updateResult,
} from '../../api/resultsApi'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthUser } from '../../auth/authTypes'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import type { RaceResponse } from '../races/raceTypes'
import { RaceResultsPage } from './RaceResultsPage'
import type { RaceResultResponse } from './resultTypes'

vi.mock('../../api/registrationsApi', () => ({
    getRegistrationsByRaceId: vi.fn(),
}))

vi.mock('../../api/racesApi', () => ({
    getRaceById: vi.fn(),
}))

vi.mock('../../api/resultsApi', () => ({
    createResult: vi.fn(),
    getResultsByRaceId: vi.fn(),
    updateResult: vi.fn(),
}))

const mockedGetRegistrationsByRaceId = vi.mocked(
    getRegistrationsByRaceId,
)
const mockedGetRaceById = vi.mocked(getRaceById)
const mockedCreateResult = vi.mocked(createResult)
const mockedGetResultsByRaceId = vi.mocked(getResultsByRaceId)
const mockedUpdateResult = vi.mocked(updateResult)

const race: RaceResponse = {
    id: 'race-id',
    name: 'Moonlight Team Race',
    description: 'An official team race.',
    scheduledAt: '2026-09-15T12:00:00',
    startLocation: 'Oasis Gate',
    finishLocation: 'Dune Arch',
    distanceMeters: 1200,
    maxParticipants: 4,
    raceType: 'TEAM',
    status: 'IN_PROGRESS',
    organizerId: 'organizer-id',
    organizerUsername: 'organizer',
    registrationDeadline: '2026-09-14T12:00:00',
    createdAt: '2026-09-01T12:00:00',
    updatedAt: '2026-09-14T12:00:00',
}

const teamRegistration: RegistrationResponse = {
    id: 'team-registration-id',
    raceId: race.id,
    competitorId: null,
    competitorName: null,
    competitorNickname: null,
    teamId: 'team-id',
    teamName: 'Moonlight Relay',
    registeredAt: '2026-09-14T12:00:00',
    status: 'APPROVED',
    startingPosition: 1,
    validationNotes: null,
    registeredByUserId: 'organizer-id',
    registeredByUsername: 'organizer',
}

const competitorRegistration: RegistrationResponse = {
    id: 'competitor-registration-id',
    raceId: race.id,
    competitorId: 'competitor-id',
    competitorName: 'Desert Runner',
    competitorNickname: 'Runner',
    teamId: null,
    teamName: null,
    registeredAt: '2026-09-14T12:00:00',
    status: 'APPROVED',
    startingPosition: 2,
    validationNotes: null,
    registeredByUserId: 'organizer-id',
    registeredByUsername: 'organizer',
}

const teamResult: RaceResultResponse = {
    id: 'team-result-id',
    raceId: race.id,
    raceName: race.name,
    registrationId: teamRegistration.id,
    competitorId: null,
    competitorName: null,
    competitorNickname: null,
    teamId: 'team-id',
    teamName: 'Moonlight Relay',
    startingPosition: 1,
    finalPosition: 1,
    completionTimeSeconds: 187,
    penaltyTimeSeconds: 0,
    status: 'FINISHED',
    notes: 'Team victory',
    recordedByUserId: 'organizer-id',
    recordedByUsername: 'organizer',
    recordedAt: '2026-09-14T12:30:00',
}

const organizerUser: AuthUser = {
    username: 'organizer',
    displayName: 'Race Organizer',
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
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: (role: string) =>
            user.roles.includes(role as AuthUser['roles'][number]),
    }
}

function renderPage(user: AuthUser = organizerUser) {
    return render(
        <AuthContext.Provider value={createAuthContextValue(user)}>
            <MemoryRouter initialEntries={[`/races/${race.id}/results`]}>
                <Routes>
                    <Route
                        path="/races/:raceId/results"
                        element={<RaceResultsPage />}
                    />
                    <Route
                        path="/races/:raceId"
                        element={<div>Race detail</div>}
                    />
                    <Route
                        path="/races/:raceId/registrations"
                        element={<div>Registrations</div>}
                    />
                    <Route path="/races" element={<div>Races</div>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    )
}

function setupSuccessfulLoad(
    raceResponse: RaceResponse = race,
    results: RaceResultResponse[] = [teamResult],
    registrations: RegistrationResponse[] = [
        teamRegistration,
        competitorRegistration,
    ],
) {
    mockedGetRaceById.mockResolvedValueOnce(raceResponse)
    mockedGetResultsByRaceId.mockResolvedValueOnce(results)
    mockedGetRegistrationsByRaceId.mockResolvedValueOnce(registrations)
}

describe('RaceResultsPage', () => {
    it('loads and displays official team results', async () => {
        setupSuccessfulLoad()

        renderPage()

        expect(
            screen.getByText('Loading race results...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', {
                name: 'Race results',
            }),
        ).toBeInTheDocument()
        expect(screen.getByText('Moonlight Relay')).toBeInTheDocument()
        expect(screen.getByText('Finished')).toBeInTheDocument()
        expect(screen.getByText('187 seconds')).toBeInTheDocument()
        expect(mockedGetRaceById).toHaveBeenCalledWith(race.id)
        expect(mockedGetResultsByRaceId).toHaveBeenCalledWith(race.id)
        expect(mockedGetRegistrationsByRaceId).toHaveBeenCalledWith(race.id)
    })

    it('allows owner organizer to record result for approved registration without result', async () => {
        setupSuccessfulLoad(race, [teamResult])

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Record result',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Record official result',
        })

        expect(
            within(dialog).getByRole('option', {
                name: 'Desert Runner (Runner)',
            }),
        ).toBeInTheDocument()
        expect(
            within(dialog).queryByRole('option', {
                name: 'Moonlight Relay',
            }),
        ).not.toBeInTheDocument()
    })

    it('creates a finished result and refreshes all recalculated positions', async () => {
        const refreshedResults: RaceResultResponse[] = [
            {
                ...teamResult,
                id: 'competitor-result-id',
                registrationId: competitorRegistration.id,
                competitorId: competitorRegistration.competitorId,
                competitorName: competitorRegistration.competitorName,
                competitorNickname: competitorRegistration.competitorNickname,
                teamId: null,
                teamName: null,
                startingPosition: 2,
                finalPosition: 1,
                completionTimeSeconds: 180,
                notes: 'Fastest finish',
            },
            {
                ...teamResult,
                finalPosition: 2,
            },
        ]

        setupSuccessfulLoad(race, [teamResult], [competitorRegistration])
        mockedCreateResult.mockResolvedValueOnce(refreshedResults[0])
        mockedGetResultsByRaceId.mockResolvedValueOnce(refreshedResults)

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Record result',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Record official result',
        })

        fireEvent.change(
            within(dialog).getByLabelText(
                'Approved participant registration',
            ),
            {
                target: {
                    value: competitorRegistration.id,
                },
            },
        )
        fireEvent.change(
            within(dialog).getByLabelText('Completion time in seconds'),
            {
                target: {
                    value: '180',
                },
            },
        )
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Save result',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateResult).toHaveBeenCalledWith(race.id, {
                registrationId: competitorRegistration.id,
                completionTimeSeconds: 180,
                penaltyTimeSeconds: 0,
                status: 'FINISHED',
                notes: null,
            })
        })

        await waitFor(() => {
            expect(mockedGetResultsByRaceId).toHaveBeenCalledTimes(2)
        })

        expect(
            await screen.findByText(
                'Official race result was recorded successfully.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('Desert Runner (Runner)')).toBeInTheDocument()
        expect(screen.getByText('Fastest finish')).toBeInTheDocument()
    })

    it('creates a non finished result with normalized request values', async () => {
        const didNotStartResult: RaceResultResponse = {
            ...teamResult,
            finalPosition: null,
            completionTimeSeconds: 0,
            penaltyTimeSeconds: 0,
            status: 'DID_NOT_START',
        }

        setupSuccessfulLoad(race, [], [teamRegistration])
        mockedCreateResult.mockResolvedValueOnce(didNotStartResult)
        mockedGetResultsByRaceId.mockResolvedValueOnce([didNotStartResult])

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Record result',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Record official result',
        })

        fireEvent.change(
            within(dialog).getByLabelText(
                'Approved participant registration',
            ),
            {
                target: {
                    value: teamRegistration.id,
                },
            },
        )
        fireEvent.change(within(dialog).getByLabelText('Result status'), {
            target: {
                value: 'DID_NOT_START',
            },
        })
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Save result',
            }),
        )

        await waitFor(() => {
            expect(mockedCreateResult).toHaveBeenCalledWith(race.id, {
                registrationId: teamRegistration.id,
                completionTimeSeconds: null,
                penaltyTimeSeconds: null,
                status: 'DID_NOT_START',
                notes: null,
            })
        })

        await waitFor(() => {
            expect(mockedGetResultsByRaceId).toHaveBeenCalledTimes(2)
        })
    })

    it('allows result editing and refreshes recalculated positions', async () => {
        const refreshedResults: RaceResultResponse[] = [
            {
                ...teamResult,
                finalPosition: 1,
                completionTimeSeconds: 175,
                notes: 'Corrected result',
            },
            {
                ...teamResult,
                id: 'second-result-id',
                registrationId: competitorRegistration.id,
                competitorId: competitorRegistration.competitorId,
                competitorName: competitorRegistration.competitorName,
                competitorNickname: competitorRegistration.competitorNickname,
                teamId: null,
                teamName: null,
                startingPosition: 2,
                finalPosition: 2,
                completionTimeSeconds: 187,
                notes: 'Second result',
            },
        ]

        setupSuccessfulLoad(
            race,
            [
                {
                    ...teamResult,
                    finalPosition: 2,
                    completionTimeSeconds: 187,
                },
                refreshedResults[1],
            ],
        )
        mockedUpdateResult.mockResolvedValueOnce(refreshedResults[0])
        mockedGetResultsByRaceId.mockResolvedValueOnce(refreshedResults)

        renderPage()

        const editButtons = await screen.findAllByRole('button', {
            name: 'Edit result',
        })

        fireEvent.click(editButtons[0])

        const dialog = screen.getByRole('dialog', {
            name: 'Edit official result',
        })

        expect(
            within(dialog).queryByLabelText(
                'Approved participant registration',
            ),
        ).not.toBeInTheDocument()
        expect(
            within(dialog).queryByLabelText('Final position'),
        ).not.toBeInTheDocument()

        fireEvent.change(
            within(dialog).getByLabelText('Completion time in seconds'),
            {
                target: {
                    value: '175',
                },
            },
        )
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Save result',
            }),
        )

        await waitFor(() => {
            expect(mockedUpdateResult).toHaveBeenCalledWith(teamResult.id, {
                completionTimeSeconds: 175,
                penaltyTimeSeconds: 0,
                status: 'FINISHED',
                notes: 'Team victory',
            })
        })

        await waitFor(() => {
            expect(mockedGetResultsByRaceId).toHaveBeenCalledTimes(2)
        })

        expect(
            await screen.findByText(
                'Official race result was updated successfully.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('Corrected result')).toBeInTheDocument()
    })

    it('shows read only mode and does not load registrations for viewer', async () => {
        mockedGetRaceById.mockResolvedValueOnce(race)
        mockedGetResultsByRaceId.mockResolvedValueOnce([teamResult])

        renderPage(viewerUser)

        expect(
            await screen.findByRole('heading', {
                name: 'Read-only access',
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Record result',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Edit result',
            }),
        ).not.toBeInTheDocument()
        expect(mockedGetRegistrationsByRaceId).not.toHaveBeenCalled()
    })

    it('shows unavailable message when race is not in progress', async () => {
        setupSuccessfulLoad(
            {
                ...race,
                status: 'CLOSED_FOR_REGISTRATION',
            },
            [],
            [],
        )

        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'Results unavailable',
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Record result',
            }),
        ).not.toBeInTheDocument()
    })

    it('shows empty state when no results exist', async () => {
        setupSuccessfulLoad(race, [], [])

        renderPage()

        expect(
            await screen.findByRole('heading', {
                name: 'No official results found',
            }),
        ).toBeInTheDocument()
    })

    it('shows backend conflicts inside dialog', async () => {
        setupSuccessfulLoad(race, [], [teamRegistration])
        mockedCreateResult.mockRejectedValueOnce(
            new ApiError(
                'Registration already has an official result',
                409,
            ),
        )

        renderPage()

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Record result',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Record official result',
        })

        fireEvent.change(
            within(dialog).getByLabelText(
                'Approved participant registration',
            ),
            {
                target: {
                    value: teamRegistration.id,
                },
            },
        )
        fireEvent.change(
            within(dialog).getByLabelText('Completion time in seconds'),
            {
                target: {
                    value: '187',
                },
            },
        )
        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Save result',
            }),
        )

        expect(
            await within(dialog).findByText(
                'Registration already has an official result',
            ),
        ).toBeInTheDocument()
    })
})