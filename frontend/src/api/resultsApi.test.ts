import { describe, expect, it, vi } from 'vitest'
import type {
    RaceResultCreateRequest,
    RaceResultResponse,
    RaceResultUpdateRequest,
} from '../features/results/resultTypes'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const {
    createResult,
    getResultById,
    getResultsByRaceId,
    updateResult,
} = await import('./resultsApi')

const resultResponse: RaceResultResponse = {
    id: 'result-id',
    raceId: 'race-id',
    raceName: 'Desert Results Race',
    registrationId: 'registration-id',
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
    notes: 'Clean finish',
    recordedByUserId: 'organizer-id',
    recordedByUsername: 'organizer',
    recordedAt: '2026-09-14T00:00:00',
}

const createRequest: RaceResultCreateRequest = {
    registrationId: 'registration-id',
    completionTimeSeconds: 187,
    penaltyTimeSeconds: 0,
    status: 'FINISHED',
    notes: 'Clean finish',
}

const updateRequest: RaceResultUpdateRequest = {
    completionTimeSeconds: 195,
    penaltyTimeSeconds: 0,
    status: 'FINISHED',
    notes: 'Corrected finish',
}

describe('resultsApi', () => {
    it('lists results for a race', async () => {
        apiClient.mockResolvedValueOnce([resultResponse])

        await expect(
            getResultsByRaceId(resultResponse.raceId),
        ).resolves.toEqual([resultResponse])

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${resultResponse.raceId}/results`,
            {
                method: 'GET',
            },
        )
    })

    it('gets a result by id', async () => {
        apiClient.mockResolvedValueOnce(resultResponse)

        await expect(
            getResultById(resultResponse.id),
        ).resolves.toEqual(resultResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/results/${resultResponse.id}`,
            {
                method: 'GET',
            },
        )
    })

    it('creates an official result for a race registration', async () => {
        apiClient.mockResolvedValueOnce(resultResponse)

        await expect(
            createResult(resultResponse.raceId, createRequest),
        ).resolves.toEqual(resultResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${resultResponse.raceId}/results`,
            {
                method: 'POST',
                body: createRequest,
            },
        )
    })

    it('updates an official result', async () => {
        const updatedResult: RaceResultResponse = {
            ...resultResponse,
            finalPosition: 2,
            completionTimeSeconds: 195,
            notes: 'Corrected finish',
        }

        apiClient.mockResolvedValueOnce(updatedResult)

        await expect(
            updateResult(resultResponse.id, updateRequest),
        ).resolves.toEqual(updatedResult)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/results/${resultResponse.id}`,
            {
                method: 'PUT',
                body: updateRequest,
            },
        )
    })
})