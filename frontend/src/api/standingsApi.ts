import { apiClient } from './apiClient'

export interface CompetitorStanding {
    competitorId: string
    name: string
    nickname: string
    points: number
}

export interface TeamStanding {
    teamId: string
    name: string
    points: number
}

export interface StandingsResponse {
    competitors: CompetitorStanding[]
    teams: TeamStanding[]
}

export function getStandings(): Promise<StandingsResponse> {
    return apiClient<StandingsResponse>('/api/standings', {
        method: 'GET',
    })
}