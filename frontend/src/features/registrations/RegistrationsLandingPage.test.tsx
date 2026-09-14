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
import type { PageResponse, RaceResponse } from '../races/raceTypes'

const getRaces = vi.fn()

vi.mock('../../api/racesApi', () => ({
    getRaces,
}))

const { RegistrationsLandingPage } = await import(
    './RegistrationsLandingPage'
)

function createRace(
    overrides: Partial<RaceResponse> = {},
): RaceResponse {
    return {
        id: 'race-id',
        name: 'Desert Dawn Race',
        description: 'A race across the desert.',
        scheduledAt: '2030-08-25T10:00:00',
        startLocation: 'Desert Gate',
        finishLocation: 'Oasis Finish',
        distanceMeters: 5000,
        maxParticipants: 20,
        raceType: 'INDIVIDUAL',
        status: 'OPEN_FOR_REGISTRATION',
        organizerId: 'organizer-id',
        organizerUsername: 'organizer',
        registrationDeadline: '2030-08-24T10:00:00',
        createdAt: '2030-08-01T10:00:00',
        updatedAt: '2030-08-01T10:00:00',
        ...overrides,
    }
}

function createPage(
    content: RaceResponse[] = [createRace()],
    overrides: Partial<PageResponse<RaceResponse>> = {},
): PageResponse<RaceResponse> {
    return {
        content,
        page: 0,
        size: 10,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
        first: true,
        last: true,
        empty: content.length === 0,
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

function renderRegistrationsLanding(
    roles: AppRole[] = ['VIEWER'],
    username = 'test-user',
) {
    return render(
        <MemoryRouter>
            <AuthContext.Provider value={createAuthValue(roles, username)}>
                <RegistrationsLandingPage />
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

function getRaceDetailLinks() {
    return screen
        .getAllByRole('link')
        .filter((link) => link.classList.contains('race-detail-link'))
}

beforeEach(() => {
    getRaces.mockReset()
})

describe('RegistrationsLandingPage', () => {
    it('loads open races with the registration center default filters', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding()

        expect(
            screen.getByText('Loading races for registrations...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', { name: 'Registrations' }),
        ).toBeInTheDocument()

        expect(getRaces).toHaveBeenCalledWith({
            status: 'OPEN_FOR_REGISTRATION',
            page: 0,
            size: 10,
            sort: 'scheduledAt,asc',
        })
    })

    it('renders all required race information and registration link', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding()

        const raceLink = await screen.findByRole('link', {
            name: 'Desert Dawn Race',
        })

        expect(raceLink).toHaveAttribute('href', '/races/race-id')

        const row = raceLink.closest('tr')

        expect(row).not.toBeNull()

        if (!row) {
            throw new Error('Registration center race row was not found.')
        }

        expect(within(row).getByText('Individual')).toBeInTheDocument()
        expect(
            within(row).getByText('Open For Registration'),
        ).toBeInTheDocument()
        expect(within(row).getByText('25/08/2030, 10:00')).toBeInTheDocument()
        expect(within(row).getByText('24/08/2030, 10:00')).toBeInTheDocument()
        expect(within(row).getByText('20')).toBeInTheDocument()
        expect(within(row).getByText('organizer')).toBeInTheDocument()

        const registrationsLink = within(row).getByRole('link', {
            name: 'View registrations for Desert Dawn Race',
        })

        expect(registrationsLink).toHaveAttribute(
            'href',
            '/races/race-id/registrations',
        )
        expect(registrationsLink).toHaveTextContent('View registrations')
    })

    it('prioritizes individual and mixed races before team races without type filter', async () => {
        const teamRace = createRace({
            id: 'team-race',
            name: 'Team Sunset Race',
            raceType: 'TEAM',
            scheduledAt: '2030-08-20T10:00:00',
        })
        const mixedRace = createRace({
            id: 'mixed-race',
            name: 'Mixed Noon Race',
            raceType: 'MIXED',
            scheduledAt: '2030-08-22T10:00:00',
        })
        const individualRace = createRace({
            id: 'individual-race',
            name: 'Individual Dawn Race',
            raceType: 'INDIVIDUAL',
            scheduledAt: '2030-08-23T10:00:00',
        })

        getRaces.mockResolvedValueOnce(
            createPage([teamRace, mixedRace, individualRace]),
        )

        renderRegistrationsLanding()

        await screen.findByText('Team Sunset Race')

        expect(getRaceDetailLinks().map((link) => link.textContent)).toEqual([
            'Individual Dawn Race',
            'Mixed Noon Race',
            'Team Sunset Race',
        ])
    })

    it('keeps API result order when a race type filter is selected', async () => {
        const firstMixedRace = createRace({
            id: 'mixed-race-one',
            name: 'Mixed First Race',
            raceType: 'MIXED',
            scheduledAt: '2030-08-25T10:00:00',
        })
        const secondMixedRace = createRace({
            id: 'mixed-race-two',
            name: 'Mixed Second Race',
            raceType: 'MIXED',
            scheduledAt: '2030-08-26T10:00:00',
        })

        getRaces
            .mockResolvedValueOnce(
                createPage([firstMixedRace, secondMixedRace]),
            )
            .mockResolvedValueOnce(
                createPage([secondMixedRace, firstMixedRace]),
            )

        renderRegistrationsLanding()

        await screen.findByText('Mixed First Race')

        fireEvent.change(screen.getByLabelText('Race type'), {
            target: { value: 'MIXED' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith({
                status: 'OPEN_FOR_REGISTRATION',
                raceType: 'MIXED',
                page: 0,
                size: 10,
                sort: 'scheduledAt,asc',
            })
        })

        expect(
            await screen.findByText('Mixed Second Race'),
        ).toBeInTheDocument()

        expect(getRaceDetailLinks().map((link) => link.textContent)).toEqual([
            'Mixed Second Race',
            'Mixed First Race',
        ])
    })

    it('restores registration center defaults when filters are cleared', async () => {
        getRaces
            .mockResolvedValueOnce(createPage())
            .mockResolvedValueOnce(createPage())
            .mockResolvedValueOnce(createPage())

        renderRegistrationsLanding()

        await screen.findByText('Desert Dawn Race')

        fireEvent.change(screen.getByLabelText('Status'), {
            target: { value: 'DRAFT' },
        })

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    status: 'DRAFT',
                    page: 0,
                }),
            )
        })

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith({
                status: 'OPEN_FOR_REGISTRATION',
                page: 0,
                size: 10,
                sort: 'scheduledAt,asc',
            })
        })

        expect(screen.getByLabelText('Status')).toHaveValue(
            'OPEN_FOR_REGISTRATION',
        )
        expect(screen.getByLabelText('Race type')).toHaveValue('')
        expect(screen.getByLabelText('Search')).toHaveValue('')
    })

    it('supports search, pagination and safe retry behavior', async () => {
        getRaces
            .mockRejectedValueOnce(new ApiError('Service failure', 500))
            .mockResolvedValueOnce(
                createPage([createRace()], {
                    totalElements: 20,
                    totalPages: 2,
                    first: true,
                    last: false,
                }),
            )
            .mockResolvedValueOnce(
                createPage([createRace()], {
                    totalElements: 20,
                    totalPages: 2,
                    first: true,
                    last: false,
                }),
            )
            .mockResolvedValueOnce(
                createPage([createRace()], {
                    page: 1,
                    totalElements: 20,
                    totalPages: 2,
                    first: false,
                    last: true,
                }),
            )

        renderRegistrationsLanding()

        expect(
            await screen.findByText(
                'The race service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(
            await screen.findByText('Desert Dawn Race'),
        ).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText('Search'), {
            target: { value: '  oasis  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Search' }))

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    status: 'OPEN_FOR_REGISTRATION',
                    search: 'oasis',
                    page: 0,
                }),
            )
        })

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
        })

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => {
            expect(getRaces).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    status: 'OPEN_FOR_REGISTRATION',
                    search: 'oasis',
                    page: 1,
                }),
            )
        })
    })

    it('shows manage registrations for administrator', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding(['ADMINISTRATOR'], 'administrator')

        const registrationsLink = await screen.findByRole('link', {
            name: 'Manage registrations for Desert Dawn Race',
        })

        expect(registrationsLink).toHaveTextContent('Manage registrations')
    })

    it('shows manage registrations for owner organizer', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding(['RACE_ORGANIZER'], 'organizer')

        const registrationsLink = await screen.findByRole('link', {
            name: 'Manage registrations for Desert Dawn Race',
        })

        expect(registrationsLink).toHaveTextContent('Manage registrations')
    })

    it('shows view registrations for non-owner organizer', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding(
            ['RACE_ORGANIZER'],
            'another-organizer',
        )

        const registrationsLink = await screen.findByRole('link', {
            name: 'View registrations for Desert Dawn Race',
        })

        expect(registrationsLink).toHaveTextContent('View registrations')
    })

    it('shows view registrations for viewer', async () => {
        getRaces.mockResolvedValueOnce(createPage())

        renderRegistrationsLanding(['VIEWER'], 'viewer')

        const registrationsLink = await screen.findByRole('link', {
            name: 'View registrations for Desert Dawn Race',
        })

        expect(registrationsLink).toHaveTextContent('View registrations')
    })
})