import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/apiError'
import { getStandings } from '../api/standingsApi'
import { HomePage } from './HomePage'

vi.mock('../api/standingsApi', () => ({
    getStandings: vi.fn(),
}))

const mockedGetStandings = vi.mocked(getStandings)

describe('HomePage', () => {
    it('loads and displays competitor and team standings', async () => {
        mockedGetStandings.mockResolvedValueOnce({
            competitors: [
                {
                    competitorId: 'competitor-one',
                    name: 'Desert Runner',
                    nickname: 'Runner',
                    points: 10,
                },
                {
                    competitorId: 'competitor-two',
                    name: 'Oasis Sprint',
                    nickname: 'Oasis',
                    points: 7,
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

        render(<HomePage />)

        expect(
            screen.getByText('Loading race standings...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', {
                name: 'Current standings',
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {
                name: 'Competitor standings',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'Team standings',
            }),
        ).toBeInTheDocument()

        const competitorTable = screen
            .getByRole('heading', {
                name: 'Competitor standings',
            })
            .closest('section')
            ?.querySelector('table')

        const teamTable = screen
            .getByRole('heading', {
                name: 'Team standings',
            })
            .closest('section')
            ?.querySelector('table')

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

    it('shows independent empty state for missing team standings', async () => {
        mockedGetStandings.mockResolvedValueOnce({
            competitors: [
                {
                    competitorId: 'competitor-one',
                    name: 'Desert Runner',
                    nickname: 'Runner',
                    points: 10,
                },
            ],
            teams: [],
        })

        render(<HomePage />)

        expect(
            await screen.findByText('Desert Runner'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', {
                name: 'No team standings',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('No team has official results yet.'),
        ).toBeInTheDocument()
    })

    it('shows complete empty state when no official standings exist', async () => {
        mockedGetStandings.mockResolvedValueOnce({
            competitors: [],
            teams: [],
        })

        render(<HomePage />)

        expect(
            await screen.findByRole('heading', {
                name: 'No standings yet',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Standings will appear here once official race results are available.',
            ),
        ).toBeInTheDocument()
    })

    it('shows a clear session error and retries standings loading', async () => {
        mockedGetStandings
            .mockRejectedValueOnce(
                new ApiError('No authenticated access token is available.', 401),
            )
            .mockResolvedValueOnce({
                competitors: [],
                teams: [],
            })

        render(<HomePage />)

        expect(
            await screen.findByText(
                'Your session is not available. Please sign in again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        await waitFor(() => {
            expect(mockedGetStandings).toHaveBeenCalledTimes(2)
        })

        expect(
            await screen.findByRole('heading', {
                name: 'No standings yet',
            }),
        ).toBeInTheDocument()
    })

    it('shows a safe service error message', async () => {
        mockedGetStandings.mockRejectedValueOnce(
            new ApiError('Database unavailable', 503),
        )

        render(<HomePage />)

        expect(
            await screen.findByText(
                'The standings service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()
    })
})