import { apiClient } from './apiClient'
import type {
    CompetitorListFilters,
    CompetitorRequest,
    CompetitorResponse,
    CompetitorStatusRequest,
    PageResponse,
} from '../features/competitors/competitorTypes'

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

function buildCompetitorListPath(
    filters: CompetitorListFilters,
): string {
    const query = new URLSearchParams()

    appendQueryParam(query, 'type', filters.type)
    appendQueryParam(query, 'status', filters.status)
    appendQueryParam(query, 'origin', filters.origin?.trim())
    appendQueryParam(query, 'search', filters.search?.trim())
    appendQueryParam(query, 'page', filters.page)
    appendQueryParam(query, 'size', filters.size)
    appendQueryParam(query, 'sort', filters.sort)

    const queryString = query.toString()

    return queryString.length > 0
        ? `/api/competitors?${queryString}`
        : '/api/competitors'
}

export function getCompetitors(
    filters: CompetitorListFilters,
): Promise<PageResponse<CompetitorResponse>> {
    return apiClient<PageResponse<CompetitorResponse>>(
        buildCompetitorListPath(filters),
        {
            method: 'GET',
        },
    )
}

export function getCompetitorById(
    competitorId: string,
): Promise<CompetitorResponse> {
    return apiClient<CompetitorResponse>(
        `/api/competitors/${encodeURIComponent(competitorId)}`,
        {
            method: 'GET',
        },
    )
}

export function createCompetitor(
    request: CompetitorRequest,
): Promise<CompetitorResponse> {
    return apiClient<CompetitorResponse>('/api/competitors', {
        method: 'POST',
        body: request,
    })
}

export function updateCompetitor(
    competitorId: string,
    request: CompetitorRequest,
): Promise<CompetitorResponse> {
    return apiClient<CompetitorResponse>(
        `/api/competitors/${encodeURIComponent(competitorId)}`,
        {
            method: 'PUT',
            body: request,
        },
    )
}

export function updateCompetitorStatus(
    competitorId: string,
    request: CompetitorStatusRequest,
): Promise<CompetitorResponse> {
    return apiClient<CompetitorResponse>(
        `/api/competitors/${encodeURIComponent(competitorId)}/status`,
        {
            method: 'PATCH',
            body: request,
        },
    )
}

export async function retireCompetitor(
    competitorId: string,
): Promise<void> {
    await apiClient<void>(
        `/api/competitors/${encodeURIComponent(competitorId)}`,
        {
            method: 'DELETE',
        },
    )
}