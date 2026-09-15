import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'
import type { AppRole } from '../../auth/authTypes'
import type { RaceResponse } from './raceTypes'

const createRaceRequest = vi.fn()
const getRaceById = vi.fn()
const updateRace = vi.fn()

vi.mock('../../api/racesApi', () => ({
    createRace: createRaceRequest,
    getRaceById,
    updateRace,
}))

const { RaceFormPage } = await import('./RaceFormPage')

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

function renderRaceFormPage(
    roles: AppRole[],
    initialEntry: string,
    username = 'test-user',
) {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <AuthContext.Provider value={createAuthValue(roles, username)}>
                <Routes>
                    <Route
                        path="/races/new"
                        element={<RaceFormPage />}
                    />
                    <Route
                        path="/races/:raceId/edit"
                        element={<RaceFormPage />}
                    />
                    <Route
                        path="/forbidden"
                        element={<h1>Access denied</h1>}
                    />
                </Routes>
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    createRaceRequest.mockReset()
    getRaceById.mockReset()
    updateRace.mockReset()
})

describe('RaceFormPage', () => {
    it('renders edit form for owner organizer', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceFormPage(
            ['RACE_ORGANIZER'],
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
            'organizer',
        )

        expect(
            await screen.findByRole('heading', { name: 'Edit race' }),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Race name')).toHaveValue(
            'Desert Dawn Race',
        )
        expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
    })

    it('shows locked state for in-progress race opened through direct edit url', async () => {
        getRaceById.mockResolvedValueOnce(
            createRace({
                status: 'IN_PROGRESS',
            }),
        )

        renderRaceFormPage(
            ['ADMINISTRATOR'],
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
            'administrator',
        )

        expect(
            await screen.findByRole('heading', {
                name: 'Race cannot be edited',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'In-progress, completed and cancelled races are locked records and cannot be updated.',
            ),
        ).toBeInTheDocument()
        expect(screen.queryByLabelText('Race name')).not.toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Return to race detail' }),
        ).toBeInTheDocument()
        expect(updateRace).not.toHaveBeenCalled()
    })

    it('renders edit form for administrator on another organizer race', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceFormPage(
            ['ADMINISTRATOR'],
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
            'administrator',
        )

        expect(
            await screen.findByRole('heading', { name: 'Edit race' }),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Race name')).toHaveValue(
            'Desert Dawn Race',
        )
        expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
    })

    it('redirects non-owner organizer to forbidden after loading race', async () => {
        getRaceById.mockResolvedValueOnce(createRace())

        renderRaceFormPage(
            ['RACE_ORGANIZER'],
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0/edit',
            'another-organizer',
        )

        expect(
            await screen.findByRole('heading', { name: 'Access denied' }),
        ).toBeInTheDocument()

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', { name: 'Edit race' }),
            ).not.toBeInTheDocument()
        })

        expect(
            screen.queryByLabelText('Race name'),
        ).not.toBeInTheDocument()
    })

    it('renders create form without loading a race', async () => {
        renderRaceFormPage(
            ['RACE_ORGANIZER'],
            '/races/new',
            'organizer',
        )

        expect(
            await screen.findByRole('heading', { name: 'Create race' }),
        ).toBeInTheDocument()
        expect(getRaceById).not.toHaveBeenCalled()
        expect(screen.getByLabelText('Race name')).toHaveValue('')
    })
})