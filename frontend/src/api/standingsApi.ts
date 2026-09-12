import { apiClient } from './apiClient'

export interface Standing {
    camelId: string
    camelName: string
    races: number
    wins: number
    points: number
}

export function getStandings(): Promise<Standing[]> {
    return apiClient<Standing[]>('/api/standings', {
        method: 'GET',
        requiresAuth: false,
    })
}