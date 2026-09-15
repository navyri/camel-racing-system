import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/apiError'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'
import type { AppRole } from '../../auth/authTypes'
import type { RaceResponse } from './raceTypes'

const cancelRace = vi.fn()
const getRaceById = vi.fn()
const updateRaceStatus = vi.fn()

vi.mock('../../api/racesApi', () => ({
    cancelRace,
    getRaceById,
    updateRaceStatus,
}))

const { RaceDetailPage } = await import('./RaceDetailPage')

function createRace(
    overrides: Partial<RaceResponse> = {},
): RaceResponse {
    return {
        id: '2f173f4a-2059-4f42-a591-394183aec8f0',
        name: 'Desert Dawn Race',
        description: 'A race across the desert.',
        scheduledAt: '2030-08-25T10:00:00',
        startLocation: 'Desert Gate',
        finishLocation: 'Oasis Finish',
        distanceMeters: 5000,
        maxParticipants: 20,
        raceType: 'MIXED',
        status: 'DRAFT',
        organizerId: '7d5c6f83-2faa-446e-96db-6a7f437985a2',
        organizerUsername: 'organizer',
        registrationDeadline: '2030-08-24T10:00:00',
        createdAt: '2030-08-01T10:00:00',
        updatedAt: '2030-08-01T10:00:00',
        ...overrides,
    }
}

function createAuthValue(
    roles: AppRole[],
    username = 'test-user',
): AuthContextValue {
    return {
        initialized: true,
        authenticated: true,
        user: {
            username,
            displayName: 'Test User',
            roles,
        },
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: (role) => roles.includes(role as AppRole),
    }
}

function renderRaceDetail(
    roles: AppRole[] = ['VIEWER'],
    initialEntry = '/races/2f173f4a-2059-4f42-a591-394183aec8f0',
    username = 'test-user',
) {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <AuthContext.Provider value={createAuthValue(roles, username)}>
                <Routes>
                    <Route path="/races/:raceId" element={<RaceDetailPage />} />
                    <Route
                        path="/races/:raceId/results"
                        element={<div>Race results</div>}
                    />
                </Routes>
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    cancelRace.mockReset()
    getRaceById.mockReset()
    updateRaceStatus.mockReset()
})

describe('RaceDetailPage', () => {
    it('renders loading and then the race detail', async () => {
        let resolveRequest: (race: RaceResponse) => void = () => undefined

        getRaceById.mockReturnValueOnce(
            new Promise<RaceResponse>((resolve) => {
                resolveRequest = resolve
            }),
        )

        renderRaceDetail()

        expect(screen.getByText('Loading race detail...')).toBeInTheDocument()

        resolveRequest(createRace())

        expect(
            await screen.findByRole('heading', { name: 'Desert Dawn Race' }),
        ).toBeInTheDocument()
        expect(screen.getByText('A race across the desert.')).toBeInTheDocument()
        expect(screen.getByText('Desert Gate')).toBeInTheDocument()
        expect(screen.getByText('Oasis Finish')).toBeInTheDocument()
        expect(screen.getByText(/5[,. ]000 meters/)).toBeInTheDocument()
        expect(screen.getByText('organizer')).toBeInTheDocument()
        expect(screen.getByText('25/08/2030, 10:00')).toBeInTheDocument()
        expect(screen.getByText('24/08/2030, 10:00')).toBeInTheDocument()
        expect(screen.getAllByText('01/08/2030, 10:00')).toHaveLength(2)
    })

    it('hides edit and cancel actions for in-progress race state', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'IN_PROGRESS',
            }),
        )

        renderRaceDetail(['ADMINISTRATOR'], undefined, 'administrator')

        await screen.findByRole('heading', { name: 'Desert Dawn Race' })

        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', { name: 'Edit race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Cancel race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Complete race' }),
        ).toBeInTheDocument()
    })

    it('shows result link for viewer role without management actions', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceDetail(['VIEWER'])

        await screen.findByRole('heading', { name: 'Desert Dawn Race' })

        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/results',
        )
        expect(
            screen.queryByRole('link', { name: 'Edit race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Open registration' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Reopen registration' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Start race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Cancel race' }),
        ).not.toBeInTheDocument()
    })

    it('renders management actions for owner organizer role', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'organizer')

        expect(
            await screen.findByRole('link', { name: 'Edit race' }),
        ).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
        )
        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/results',
        )
        expect(
            screen.getByRole('button', { name: 'Open registration' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel race' }),
        ).toBeInTheDocument()
    })

    it('shows reopen and start actions for closed registration', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'CLOSED_FOR_REGISTRATION',
            }),
        )

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'organizer')

        await screen.findByRole('heading', { name: 'Desert Dawn Race' })

        expect(
            screen.getByRole('button', { name: 'Reopen registration' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Start race' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel race' }),
        ).toBeInTheDocument()
    })

    it('hides management actions for non-owner organizer role', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'another-organizer')

        await screen.findByRole('heading', { name: 'Desert Dawn Race' })

        expect(
            screen.getByRole('link', { name: 'View registrations' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', { name: 'Edit race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Open registration' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Reopen registration' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Cancel race' }),
        ).not.toBeInTheDocument()
    })

    it('renders management actions for administrator role on another organizer race', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceDetail(['ADMINISTRATOR'], undefined, 'administrator')

        expect(
            await screen.findByRole('link', { name: 'Edit race' }),
        ).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
        )
        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/results',
        )
        expect(
            screen.getByRole('button', { name: 'Open registration' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel race' }),
        ).toBeInTheDocument()
    })

    it('hides edit and cancel actions for terminal race states', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'COMPLETED',
            }),
        )

        renderRaceDetail(['ADMINISTRATOR'], undefined, 'administrator')

        await screen.findByRole('heading', { name: 'Desert Dawn Race' })

        expect(
            screen.getByRole('link', { name: 'View results' }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', { name: 'Edit race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Complete race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Reopen registration' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Cancel race' }),
        ).not.toBeInTheDocument()
    })

    it('shows not found state for a missing race', async () => {
        getRaceById.mockRejectedValueOnce(
            new ApiError('Race missing', 404),
        )

        renderRaceDetail()

        expect(
            await screen.findByText('The requested race was not found.'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Return to races' }),
        ).toHaveAttribute('href', '/races')
    })

    it('shows a retry action for service errors', async () => {
        getRaceById
            .mockRejectedValueOnce(new ApiError('Service failure', 500))
            .mockResolvedValueOnce(createRace())

        renderRaceDetail()

        expect(
            await screen.findByText(
                'The race service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(
            await screen.findByRole('heading', { name: 'Desert Dawn Race' }),
        ).toBeInTheDocument()
        expect(getRaceById).toHaveBeenCalledTimes(2)
    })

    it('updates status after confirmation and shows success feedback', async () => {
        getRaceById.mockResolvedValueOnce(createRace())
        updateRaceStatus.mockResolvedValueOnce(
            createRace({
                status: 'OPEN_FOR_REGISTRATION',
            }),
        )

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'organizer')

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Open registration',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Open registration',
        })

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Open registration',
            }),
        )

        await waitFor(() => {
            expect(updateRaceStatus).toHaveBeenCalledWith(
                '2f173f4a-2059-4f42-a591-394183aec8f0',
                {
                    status: 'OPEN_FOR_REGISTRATION',
                },
            )
        })

        expect(
            await screen.findByText(
                'Race status changed to Open For Registration.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Close registration' }),
        ).toBeInTheDocument()
    })

    it('reopens registration after confirmation and shows close action', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'CLOSED_FOR_REGISTRATION',
            }),
        )
        updateRaceStatus.mockResolvedValueOnce(
            createRace({
                status: 'OPEN_FOR_REGISTRATION',
            }),
        )

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'organizer')

        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Reopen registration',
            }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Reopen registration',
        })

        expect(
            within(dialog).getByText(
                'This will allow eligible participants to register for the race again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Reopen registration',
            }),
        )

        await waitFor(() => {
            expect(updateRaceStatus).toHaveBeenCalledWith(
                '2f173f4a-2059-4f42-a591-394183aec8f0',
                {
                    status: 'OPEN_FOR_REGISTRATION',
                },
            )
        })

        expect(
            await screen.findByText(
                'Race status changed to Open For Registration.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Close registration' }),
        ).toBeInTheDocument()
    })

    it('cancels a race after confirmation and hides management actions', async () => {
        getRaceById.mockResolvedValueOnce(createRace())
        cancelRace.mockResolvedValueOnce(undefined)

        renderRaceDetail(['RACE_ORGANIZER'], undefined, 'organizer')

        fireEvent.click(
            await screen.findByRole('button', { name: 'Cancel race' }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Cancel race',
        })

        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel race' }),
        )

        await waitFor(() => {
            expect(cancelRace).toHaveBeenCalledWith(
                '2f173f4a-2059-4f42-a591-394183aec8f0',
            )
        })

        expect(
            await screen.findByText('Race was cancelled successfully.'),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', { name: 'Edit race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Cancel race' }),
        ).not.toBeInTheDocument()
    })

    it('keeps the dialog open and shows conflict errors', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'IN_PROGRESS',
            }),
        )
        updateRaceStatus.mockRejectedValueOnce(
            new ApiError(
                'Race cannot be completed without an official winner',
                409,
            ),
        )

        renderRaceDetail(['ADMINISTRATOR'], undefined, 'administrator')

        fireEvent.click(
            await screen.findByRole('button', { name: 'Complete race' }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Complete race',
        })

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Complete race',
            }),
        )

        expect(
            await screen.findByText(
                'Race cannot be completed without an official winner',
            ),
        ).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
})