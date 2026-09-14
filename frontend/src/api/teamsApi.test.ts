import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
    addTeamMember,
    createTeam,
    deactivateTeam,
    getTeamById,
    getTeams,
    removeTeamMember,
    updateTeam,
} from './teamsApi'
import { apiClient } from './apiClient'

vi.mock('./apiClient', () => ({
    apiClient: vi.fn(),
}))

const mockedApiClient = vi.mocked(apiClient)

describe('teamsApi', () => {
    beforeEach(() => {
        mockedApiClient.mockReset()
    })

    it('gets teams with filters and pagination', async () => {
        mockedApiClient.mockResolvedValue({
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
        })

        await getTeams({
            status: 'ACTIVE',
            search: 'desert riders',
            page: 1,
            size: 25,
            sort: 'victories,desc',
        })

        expect(mockedApiClient).toHaveBeenCalledWith(
            '/api/teams?status=ACTIVE&search=desert+riders&page=1&size=25&sort=victories%2Cdesc',
        )
    })

    it('omits empty team filters', async () => {
        mockedApiClient.mockResolvedValue({
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
        })

        await getTeams({
            search: '   ',
        })

        expect(mockedApiClient).toHaveBeenCalledWith('/api/teams')
    })

    it('gets a team by id', async () => {
        mockedApiClient.mockResolvedValue({})

        await getTeamById('team-1')

        expect(mockedApiClient).toHaveBeenCalledWith('/api/teams/team-1')
    })

    it('creates a team', async () => {
        mockedApiClient.mockResolvedValue({})

        await createTeam({
            name: 'Desert Riders',
            description: 'A relay racing team',
            coachName: 'Amina',
        })

        expect(mockedApiClient).toHaveBeenCalledWith('/api/teams', {
            method: 'POST',
            body: {
                name: 'Desert Riders',
                description: 'A relay racing team',
                coachName: 'Amina',
            },
        })
    })

    it('updates a team', async () => {
        mockedApiClient.mockResolvedValue({})

        await updateTeam('team-1', {
            name: 'Desert Riders',
            description: 'Updated team description',
            coachName: 'Amina',
        })

        expect(mockedApiClient).toHaveBeenCalledWith('/api/teams/team-1', {
            method: 'PUT',
            body: {
                name: 'Desert Riders',
                description: 'Updated team description',
                coachName: 'Amina',
            },
        })
    })

    it('deactivates a team', async () => {
        mockedApiClient.mockResolvedValue(null)

        await deactivateTeam('team-1')

        expect(mockedApiClient).toHaveBeenCalledWith('/api/teams/team-1', {
            method: 'DELETE',
        })
    })

    it('adds a competitor to a team', async () => {
        mockedApiClient.mockResolvedValue({})

        await addTeamMember('team-1', 'competitor-1')

        expect(mockedApiClient).toHaveBeenCalledWith(
            '/api/teams/team-1/members/competitor-1',
            {
                method: 'POST',
            },
        )
    })

    it('removes a competitor from a team', async () => {
        mockedApiClient.mockResolvedValue(null)

        await removeTeamMember('team-1', 'competitor-1')

        expect(mockedApiClient).toHaveBeenCalledWith(
            '/api/teams/team-1/members/competitor-1',
            {
                method: 'DELETE',
            },
        )
    })
})