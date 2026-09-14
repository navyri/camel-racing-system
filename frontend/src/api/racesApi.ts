import { apiClient } from './apiClient'
import type {
    PageResponse,
    RaceListFilters,
    RaceRequest,
    RaceResponse,
    RaceStatusRequest,
} from '../features/races/raceTypes'

function appendQueryParam(
    query: URLSearchParams,
    name: string,
    value: string | number | undefined,
) {
    if (value === undefined) {
        return
    }

    const normalizedValue = String(value).trim()

    if (normalizedValue.length > 0) {
        query.set(name, normalizedValue)
    }
}

function buildRaceListPath(filters: RaceListFilters): string {
    const query = new URLSearchParams()

    appendQueryParam(query, 'status', filters.status)
    appendQueryParam(query, 'raceType', filters.raceType)
    appendQueryParam(query, 'search', filters.search?.trim())
    appendQueryParam(query, 'page', filters.page)
    appendQueryParam(query, 'size', filters.size)
    appendQueryParam(query, 'sort', filters.sort)

    const queryString = query.toString()

    return queryString.length > 0 ? `/api/races?${queryString}` : '/api/races'
}

export function getRaces(
    filters: RaceListFilters,
): Promise<PageResponse<RaceResponse>> {
    return apiClient<PageResponse<RaceResponse>>(buildRaceListPath(filters), {
        method: 'GET',
    })
}

export function getRaceById(raceId: string): Promise<RaceResponse> {
    return apiClient<RaceResponse>(`/api/races/${encodeURIComponent(raceId)}`, {
        method: 'GET',
    })
}

export function createRace(request: RaceRequest): Promise<RaceResponse> {
    return apiClient<RaceResponse>('/api/races', {
        method: 'POST',
        body: request,
    })
}

export function updateRace(
    raceId: string,
    request: RaceRequest,
): Promise<RaceResponse> {
    return apiClient<RaceResponse>(`/api/races/${encodeURIComponent(raceId)}`, {
        method: 'PUT',
        body: request,
    })
}

export function updateRaceStatus(
    raceId: string,
    request: RaceStatusRequest,
): Promise<RaceResponse> {
    return apiClient<RaceResponse>(
        `/api/races/${encodeURIComponent(raceId)}/status`,
        {
            method: 'PATCH',
            body: request,
        },
    )
}

export async function cancelRace(raceId: string): Promise<void> {
    await apiClient<void>(`/api/races/${encodeURIComponent(raceId)}`, {
        method: 'DELETE',
    })
}