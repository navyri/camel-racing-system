import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/apiError'
import { getCompetitors } from '../api/competitorsApi'
import { getUpcomingRaces } from '../api/racesApi'
import { getRecentResults } from '../api/resultsApi'
import { getStandings } from '../api/standingsApi'
import { HomePage } from './HomePage'

vi.mock('../api/standingsApi', () => ({
    getStandings: vi.fn(),
}))

vi.mock('../api/racesApi', () => ({
    getUpcomingRaces: vi.fn(),
}))

vi.mock('../api/competitorsApi', () => ({
    getCompetitors: vi.fn(),
}))

vi.mock('../api/resultsApi', () => ({
    getRecentResults: vi.fn(),
}))

const mockedGetStandings = vi.mocked(getStandings)
const mockedGetUpcomingRaces = vi.mocked(getUpcomingRaces)
const mockedGetCompetitors = vi.mocked(getCompetitors)
const mockedGetRecentResults = vi.mocked(getRecentResults)

function renderHomePage() {
    return render(
        <MemoryRouter>
            <HomePage />
        </MemoryRouter>,
    )
}

function mockDashboardSuccess() {
    mockedGetStandings.mockResolvedValueOnce({
        competitors: [
            {
                competitorId: 'competitor-one',
                name: 'Desert Runner',
                nickname: 'Runner',
                points: 10,
            },
        ],
        teams: [
            {
                teamId: 'team-one',
                name: 'Moonlight Relay',
                points: 10,
            },
        ],
    })

    mockedGetUpcomingRaces.mockResolvedValueOnce([
        {
            id: 'race-one',
            name: 'Dawn Sand Race',
            description: 'A future race.',
            scheduledAt: '2030-08-25T10:00:00',
            startLocation: 'Desert Gate',
            finishLocation: 'Oasis Finish',
            distanceMeters: 5000,
            maxParticipants: 20,
            raceType: 'MIXED',
            status: 'OPEN_FOR_REGISTRATION',
            organizerId: 'organizer-one',
            organizerUsername: 'organizer',
            registrationDeadline: '2030-08-24T10:00:00',
            createdAt: '2030-08-01T10:00:00',
            updatedAt: '2030-08-01T10:00:00',
        },
    ])

    mockedGetCompetitors.mockResolvedValueOnce({
        content: [
            {
                id: 'competitor-one',
                name: 'Desert Runner',
                nickname: 'Runner',
                competitorType: 'CAMEL',
                dateOfBirth: null,
                approximateAge: 8,
                weightKg: 400,
                heightCm: 220,
                origin: 'Colombia',
                status: 'ACTIVE',
                registrationDate: '2026-09-13T03:00:00',
                victories: 1,
                defeats: 0,
                completedRaces: 1,
            },
        ],
        page: 0,
        size: 5,
        totalElements: 7,
        totalPages: 2,
        first: true,
        last: false,
        empty: false,
    })

    mockedGetRecentResults.mockResolvedValueOnce([
        {
            id: 'result-one',
            raceId: 'race-one',
            raceName: 'Dawn Sand Race',
            registrationId: 'registration-one',
            competitorId: 'competitor-one',
            competitorName: 'Desert Runner',
            competitorNickname: 'Runner',
            teamId: null,
            teamName: null,
            startingPosition: 1,
            finalPosition: 1,
            completionTimeSeconds: 187,
            penaltyTimeSeconds: 0,
            status: 'FINISHED',
            notes: 'Clean finish',
            recordedByUserId: 'organizer-one',
            recordedByUsername: 'organizer',
            recordedAt: '2030-08-25T12:00:00',
        },
    ])
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('HomePage', () => {
    it('loads dashboard sources and displays the required sections', async () => {
        mockDashboardSuccess()

        renderHomePage()

        expect(
            screen.getByText('Loading upcoming races...'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Loading active competitors...'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Loading recently recorded results...'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Loading race standings...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', {
                name: 'Season dashboard',
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {
                name: 'Upcoming races',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'Active competitors',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'Recently recorded results',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'Current standings',
            }),
        ).toBeInTheDocument()

        expect(screen.getAllByText('Dawn Sand Race')).toHaveLength(2)
        expect(screen.getByText('MIXED')).toBeInTheDocument()
        expect(screen.getByText('OPEN FOR REGISTRATION')).toBeInTheDocument()
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getAllByText('Desert Runner')).not.toHaveLength(0)
        expect(screen.getAllByText('Runner')).toHaveLength(2)
        expect(screen.getByText('Finished')).toBeInTheDocument()
        expect(screen.getByText('Finish 3m 7s, penalty 0s')).toBeInTheDocument()

        expect(mockedGetStandings).toHaveBeenCalledTimes(1)
        expect(mockedGetUpcomingRaces).toHaveBeenCalledWith(5)
        expect(mockedGetCompetitors).toHaveBeenCalledWith({
            status: 'ACTIVE',
            page: 0,
            size: 5,
            sort: 'name,asc',
        })
        expect(mockedGetRecentResults).toHaveBeenCalledWith(5)
    })

    it('keeps successful sections visible when another source fails', async () => {
        mockedGetStandings.mockResolvedValueOnce({
            competitors: [],
            teams: [],
        })
        mockedGetUpcomingRaces.mockRejectedValueOnce(
            new ApiError('Service unavailable', 503),
        )
        mockedGetCompetitors.mockResolvedValueOnce({
            content: [],
            page: 0,
            size: 5,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
        })
        mockedGetRecentResults.mockResolvedValueOnce([])

        renderHomePage()

        expect(
            await screen.findByText(
                'The upcoming races service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {
                name: 'No active competitors',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No recently recorded results',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No standings yet',
            }),
        ).toBeInTheDocument()
    })

    it('shows empty states when dashboard sources have no data', async () => {
        mockedGetStandings.mockResolvedValueOnce({
            competitors: [],
            teams: [],
        })
        mockedGetUpcomingRaces.mockResolvedValueOnce([])
        mockedGetCompetitors.mockResolvedValueOnce({
            content: [],
            page: 0,
            size: 5,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
        })
        mockedGetRecentResults.mockResolvedValueOnce([])

        renderHomePage()

        expect(
            await screen.findByRole('heading', {
                name: 'No upcoming races',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No active competitors',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No recently recorded results',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No standings yet',
            }),
        ).toBeInTheDocument()
    })

    it('retries all dashboard requests after a section error', async () => {
        mockedGetStandings
            .mockRejectedValueOnce(
                new ApiError('No authenticated access token is available.', 401),
            )
            .mockResolvedValueOnce({
                competitors: [],
                teams: [],
            })
        mockedGetUpcomingRaces
            .mockRejectedValueOnce(
                new ApiError('No authenticated access token is available.', 401),
            )
            .mockResolvedValueOnce([])
        mockedGetCompetitors
            .mockRejectedValueOnce(
                new ApiError('No authenticated access token is available.', 401),
            )
            .mockResolvedValueOnce({
                content: [],
                page: 0,
                size: 5,
                totalElements: 0,
                totalPages: 0,
                first: true,
                last: true,
                empty: true,
            })
        mockedGetRecentResults
            .mockRejectedValueOnce(
                new ApiError('No authenticated access token is available.', 401),
            )
            .mockResolvedValueOnce([])

        renderHomePage()

        expect(
            await screen.findAllByText(
                'Your session is not available. Please sign in again.',
            ),
        ).not.toHaveLength(0)

        fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0])

        await waitFor(() => {
            expect(mockedGetStandings).toHaveBeenCalledTimes(2)
            expect(mockedGetUpcomingRaces).toHaveBeenCalledTimes(2)
            expect(mockedGetCompetitors).toHaveBeenCalledTimes(2)
            expect(mockedGetRecentResults).toHaveBeenCalledTimes(2)
        })

        expect(
            await screen.findByRole('heading', {
                name: 'No standings yet',
            }),
        ).toBeInTheDocument()
    })

    it('keeps competitor and team standings tables', async () => {
        mockDashboardSuccess()

        renderHomePage()

        const competitorHeading = await screen.findByRole('heading', {
            name: 'Competitor standings',
        })
        const teamHeading = screen.getByRole('heading', {
            name: 'Team standings',
        })

        const competitorTable = competitorHeading
            .closest('section')
            ?.querySelector('table')
        const teamTable = teamHeading.closest('section')?.querySelector('table')

        expect(competitorTable).not.toBeNull()
        expect(teamTable).not.toBeNull()

        if (!competitorTable || !teamTable) {
            throw new Error('Standings tables were not rendered.')
        }

        expect(
            within(competitorTable).getByText('Desert Runner'),
        ).toBeInTheDocument()
        expect(within(competitorTable).getByText('Runner')).toBeInTheDocument()
        expect(within(competitorTable).getByText('10')).toBeInTheDocument()
        expect(
            within(teamTable).getByText('Moonlight Relay'),
        ).toBeInTheDocument()
        expect(within(teamTable).getByText('10')).toBeInTheDocument()
    })
})