import { describe, expect, it, vi } from 'vitest'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const { getStandings } = await import('./standingsApi')

describe('standingsApi', () => {
    it('gets authenticated combined competitor and team standings', async () => {
        const response = {
            competitors: [
                {
                    competitorId: 'competitor-id',
                    name: 'Desert Runner',
                    nickname: 'Runner',
                    points: 10,
                },
            ],
            teams: [
                {
                    teamId: 'team-id',
                    name: 'Moonlight Relay',
                    points: 7,
                },
            ],
        }

        apiClient.mockResolvedValueOnce(response)

        await expect(getStandings()).resolves.toEqual(response)

        expect(apiClient).toHaveBeenCalledWith('/api/standings', {
            method: 'GET',
        })
    })
})