import { apiClient } from './apiClient'
import type {
    TeamPageResponse,
    TeamRequest,
    TeamResponse,
    TeamStatus,
} from '../features/teams/teamTypes'

export interface GetTeamsParams {
    status?: TeamStatus
    search?: string
    page?: number
    size?: number
    sort?: string
}

function buildTeamsQuery(params: GetTeamsParams): string {
    const query = new URLSearchParams()

    if (params.status) {
        query.set('status', params.status)
    }

    if (params.search?.trim()) {
        query.set('search', params.search.trim())
    }

    if (params.page !== undefined) {
        query.set('page', String(params.page))
    }

    if (params.size !== undefined) {
        query.set('size', String(params.size))
    }

    if (params.sort?.trim()) {
        query.set('sort', params.sort.trim())
    }

    const serializedQuery = query.toString()

    return serializedQuery ? `?${serializedQuery}` : ''
}

export async function getTeams(
    params: GetTeamsParams = {},
): Promise<TeamPageResponse> {
    return apiClient<TeamPageResponse>(
        `/api/teams${buildTeamsQuery(params)}`,
    )
}

export async function getTeamById(
    teamId: string,
): Promise<TeamResponse> {
    return apiClient<TeamResponse>(`/api/teams/${teamId}`)
}

export async function createTeam(
    request: TeamRequest,
): Promise<TeamResponse> {
    return apiClient<TeamResponse>('/api/teams', {
        method: 'POST',
        body: request,
    })
}

export async function updateTeam(
    teamId: string,
    request: TeamRequest,
): Promise<TeamResponse> {
    return apiClient<TeamResponse>(`/api/teams/${teamId}`, {
        method: 'PUT',
        body: request,
    })
}

export async function deactivateTeam(teamId: string): Promise<void> {
    await apiClient<null>(`/api/teams/${teamId}`, {
        method: 'DELETE',
    })
}

export async function addTeamMember(
    teamId: string,
    competitorId: string,
): Promise<TeamResponse> {
    return apiClient<TeamResponse>(
        `/api/teams/${teamId}/members/${competitorId}`,
        {
            method: 'POST',
        },
    )
}

export async function removeTeamMember(
    teamId: string,
    competitorId: string,
): Promise<void> {
    await apiClient<null>(
        `/api/teams/${teamId}/members/${competitorId}`,
        {
            method: 'DELETE',
        },
    )
}