import { apiClient } from './apiClient'
import type {
    RaceResultCreateRequest,
    RaceResultResponse,
    RaceResultUpdateRequest,
} from '../features/results/resultTypes'

export function getResultsByRaceId(
    raceId: string,
): Promise<RaceResultResponse[]> {
    return apiClient<RaceResultResponse[]>(
        `/api/races/${encodeURIComponent(raceId)}/results`,
        {
            method: 'GET',
        },
    )
}

export function getRecentResults(limit = 5): Promise<RaceResultResponse[]> {
    return apiClient<RaceResultResponse[]>(`/api/results/recent?limit=${limit}`, {
        method: 'GET',
    })
}

export function getResultById(
    resultId: string,
): Promise<RaceResultResponse> {
    return apiClient<RaceResultResponse>(
        `/api/results/${encodeURIComponent(resultId)}`,
        {
            method: 'GET',
        },
    )
}

export function createResult(
    raceId: string,
    request: RaceResultCreateRequest,
): Promise<RaceResultResponse> {
    return apiClient<RaceResultResponse>(
        `/api/races/${encodeURIComponent(raceId)}/results`,
        {
            method: 'POST',
            body: request,
        },
    )
}

export function updateResult(
    resultId: string,
    request: RaceResultUpdateRequest,
): Promise<RaceResultResponse> {
    return apiClient<RaceResultResponse>(
        `/api/results/${encodeURIComponent(resultId)}`,
        {
            method: 'PUT',
            body: request,
        },
    )
}