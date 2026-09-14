import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/apiError'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'
import type { AppRole } from '../../auth/authTypes'
import type { PageResponse, RaceResponse } from './raceTypes'

const getRaces = vi.fn()

vi.mock('../../api/racesApi', () => ({
    getRaces,
}))

const { RaceListPage } = await import('./RaceListPage')

function createRace(): RaceResponse {
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
        status: 'OPEN_FOR_REGISTRATION',
        organizerId: '7d5c6f83-2faa-446e-96db-6a7f437985a2',
        organizerUsername: 'organizer',
        registrationDeadline: '2030-08-24T10:00:00',
        createdAt: '2030-08-01T10:00:00',
        updatedAt: '2030-08-01T10:00:00',
    }
}

function createPage(
    overrides: Partial<PageResponse<RaceResponse>> = {},
): PageResponse<RaceResponse> {
    return {
        content: [createRace()],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
        ...overrides,
    }
}

function createAuthValue(roles: AppRole[]): AuthContextValue {
    return {
        initialized: true,
        authenticated: true,
        user: {
            username: 'test-user',
            displayName: 'Test User',
            roles,
        },
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: (role) => roles.includes(role as AppRole),
    }
}

function renderRaceList(roles: AppRole[] = ['VIEWER']) {
    return render(
        <MemoryRouter>
            <AuthContext.Provider value={createAuthValue(roles)}>
                <RaceListPage />
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    getRaces.mockReset()
})

describe('RaceListPage', () => {
    it('renders loading and then the race table', async () => {
        let resolveRequest: (value: PageResponse<RaceResponse>) => void = () =>
            undefined

        getRaces.mockReturnValueOnce(
            new Promise<PageResponse<RaceResponse>>((resolve) => {
                resolveRequest = resolve
            }),
        )

        renderRaceList()

        expect(screen.getByText('Loading races...')).toBeInTheDocument()

        resolveRequest(createPage())

        expect(
            await screen.findByText('Desert Dawn Race'),
        ).toBeInTheDocument()

        const tableBody = screen
            .getByText('Desert Dawn Race')
            .closest('tbody')

        expect(tableBody).not.toBeNull()

        if (!tableBody) {
            throw new Error('Race table body was not found.')
        }

        expect(within(tableBody).getByText('Mixed')).toBeInTheDocument()
        expect(
            within(tableBody).getByText('Open For Registration'),
        ).toBeInTheDocument()
        expect(
            within(tableBody).getByText('Desert Gate to Oasis Finish'),
        ).toBeInTheDocument()
        expect(within(tableBody).getByText('organizer')).toBeInTheDocument()
    })

    it('renders an empty state', async () => {
        getRaces.mockResolvedValueOnce(
            createPage({
                content: [],
                totalElements: 0,
                totalPages: 0,
                empty: true,
            }),
        )

        renderRaceList()

        expect(await screen.findByText('No races found')).toBeInTheDocument()
    })

    it('renders a safe error message and retries the request', async () => {
        getRaces
            .mockRejectedValueOnce(new ApiError('Server failure', 500))
            .mockResolvedValueOnce(createPage())

        renderRaceList()

        expect(
            await screen.findByText(
                'The race service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(
            await screen.findByText('Desert Dawn Race'),
        ).toBeInTheDocument()
        expect(getRaces).toHaveBeenCalledTimes(2)
    })

    it('resets the page when a filter changes', async () => {
        getRaces
            .mockResolvedValueOnce(
                createPage({
                    page: 2,
                    totalPages: 4,
                    first: false,
                    last: false,
                }),
            )
            .mockResolvedValue(createPage())

        renderRaceList()

        await screen.findByText('Desert Dawn Race')

        fireEvent.change(screen.getByLabelText('Status'), {
            target: { value: 'DRAFT' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    status: 'DRAFT',
                    page: 0,
                    size: 10,
                    sort: 'scheduledAt,asc',
                }),
            )
        })
    })

    it('keeps filters and sort when changing pages', async () => {
        getRaces.mockResolvedValue(
            createPage({
                totalElements: 50,
                totalPages: 2,
                first: true,
                last: false,
            }),
        )

        renderRaceList()

        await screen.findByText('Desert Dawn Race')

        fireEvent.change(screen.getByLabelText('Race type'), {
            target: { value: 'MIXED' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    raceType: 'MIXED',
                    page: 0,
                }),
            )
        })

        fireEvent.change(screen.getByLabelText('Results per page'), {
            target: { value: '25' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    raceType: 'MIXED',
                    page: 0,
                    size: 25,
                }),
            )
        })

        fireEvent.change(screen.getByLabelText('Sort by'), {
            target: { value: 'name' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    raceType: 'MIXED',
                    page: 0,
                    size: 25,
                    sort: 'name,asc',
                }),
            )
        })

        getRaces.mockResolvedValueOnce(
            createPage({
                page: 1,
                size: 25,
                totalElements: 50,
                totalPages: 2,
                first: false,
                last: true,
            }),
        )

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith({
                raceType: 'MIXED',
                page: 1,
                size: 25,
                sort: 'name,asc',
            })
        })
    })

    it('submits a trimmed search and resets the page', async () => {
        getRaces
            .mockResolvedValueOnce(
                createPage({
                    page: 1,
                    totalPages: 2,
                    first: false,
                    last: true,
                }),
            )
            .mockResolvedValueOnce(createPage())

        renderRaceList()

        await screen.findByText('Desert Dawn Race')

        fireEvent.change(screen.getByLabelText('Search'), {
            target: { value: '  oasis  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Search' }))

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    search: 'oasis',
                    page: 0,
                }),
            )
        })
    })

    it('links each race name to its detail page', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRaceList()

        const raceLink = await screen.findByRole('link', {
            name: 'Desert Dawn Race',
        })

        expect(raceLink).toHaveAttribute(
            'href',
            '/races/2f173f4a-2059-4f42-a591-394183aec8f0',
        )
    })

    it('shows create race only for administrator and organizer roles', async () => {
        getRaces.mockResolvedValue(createPage())

        const { rerender } = renderRaceList(['RACE_ORGANIZER'])

        expect(
            await screen.findByRole('link', { name: 'Create race' }),
        ).toHaveAttribute('href', '/races/new')

        rerender(
            <MemoryRouter>
                <AuthContext.Provider
                    value={createAuthValue(['ADMINISTRATOR'])}
                >
                    <RaceListPage />
                </AuthContext.Provider>
            </MemoryRouter>,
        )

        expect(
            await screen.findByRole('link', { name: 'Create race' }),
        ).toHaveAttribute('href', '/races/new')
    })

    it('does not render write actions for viewer role', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRaceList(['VIEWER'])

        await screen.findByText('Desert Dawn Race')

        expect(
            screen.queryByRole('link', { name: 'Create race' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: /create|edit|cancel|delete|change status/i,
            }),
        ).not.toBeInTheDocument()
    })
})