import { describe, expect, it, vi } from 'vitest'
import {
    createDefaultRaceListFilters,
    type PageResponse,
    type RaceRequest,
    type RaceResponse,
} from '../features/races/raceTypes'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const {
    cancelRace,
    createRace,
    getRaceById,
    getRaces,
    getUpcomingRaces,
    updateRace,
    updateRaceStatus,
} = await import('./racesApi')

const pageResponse: PageResponse<RaceResponse> = {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
}

const raceResponse: RaceResponse = {
    id: '2f173f4a-2059-4f42-a591-394183aec8f0',
    name: 'Desert Dawn Race',
    description: 'A race across the desert.',
    scheduledAt: '2030-08-25T10:00:00',
    startLocation: 'Desert Gate',
    finishLocation: 'Oasis Finish',
    distanceMeters: 5000,
    maxParticipants: 20,
    raceType: 'MIXED',
    status: 'DRAFT',
    organizerId: '7d5c6f83-2faa-446e-96db-6a7f437985a2',
    organizerUsername: 'organizer',
    registrationDeadline: '2030-08-24T10:00:00',
    createdAt: '2030-08-01T10:00:00',
    updatedAt: '2030-08-01T10:00:00',
}

const raceRequest: RaceRequest = {
    name: 'Desert Dawn Race',
    description: 'A race across the desert.',
    scheduledAt: '2030-08-25T10:00:00',
    startLocation: 'Desert Gate',
    finishLocation: 'Oasis Finish',
    distanceMeters: 5000,
    maxParticipants: 20,
    raceType: 'MIXED',
    registrationDeadline: '2030-08-24T10:00:00',
}

describe('racesApi', () => {
    it('uses the default paginated endpoint contract', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await expect(getRaces(createDefaultRaceListFilters())).resolves.toEqual(
            pageResponse,
        )

        expect(apiClient).toHaveBeenCalledWith(
            '/api/races?page=0&size=10&sort=scheduledAt%2Casc',
            {
                method: 'GET',
            },
        )
    })

    it('includes only populated filters and trims search text', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await getRaces({
            status: 'OPEN_FOR_REGISTRATION',
            raceType: 'MIXED',
            search: '  desert  ',
            page: 2,
            size: 25,
            sort: 'name,desc',
        })

        expect(apiClient).toHaveBeenCalledWith(
            '/api/races?status=OPEN_FOR_REGISTRATION&raceType=MIXED&search=desert&page=2&size=25&sort=name%2Cdesc',
            {
                method: 'GET',
            },
        )
    })

    it('omits empty optional filters', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await getRaces({
            page: 0,
            size: 50,
            sort: 'createdAt,asc',
            search: ' ',
        })

        expect(apiClient).toHaveBeenCalledWith(
            '/api/races?page=0&size=50&sort=createdAt%2Casc',
            {
                method: 'GET',
            },
        )
    })

    it('gets upcoming races with the default limit', async () => {
        apiClient.mockResolvedValueOnce([raceResponse])

        await expect(getUpcomingRaces()).resolves.toEqual([raceResponse])

        expect(apiClient).toHaveBeenCalledWith('/api/races/upcoming?limit=5', {
            method: 'GET',
        })
    })

    it('gets upcoming races with a custom limit', async () => {
        apiClient.mockResolvedValueOnce([raceResponse])

        await expect(getUpcomingRaces(3)).resolves.toEqual([raceResponse])

        expect(apiClient).toHaveBeenCalledWith('/api/races/upcoming?limit=3', {
            method: 'GET',
        })
    })

    it('gets a race by id', async () => {
        apiClient.mockResolvedValueOnce(raceResponse)

        await expect(getRaceById(raceResponse.id)).resolves.toEqual(raceResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${raceResponse.id}`,
            {
                method: 'GET',
            },
        )
    })

    it('creates a race with the audited request contract', async () => {
        apiClient.mockResolvedValueOnce(raceResponse)

        await expect(createRace(raceRequest)).resolves.toEqual(raceResponse)

        expect(apiClient).toHaveBeenCalledWith('/api/races', {
            method: 'POST',
            body: raceRequest,
        })
    })

    it('updates a race with put and the audited request contract', async () => {
        apiClient.mockResolvedValueOnce(raceResponse)

        await expect(
            updateRace(raceResponse.id, raceRequest),
        ).resolves.toEqual(raceResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${raceResponse.id}`,
            {
                method: 'PUT',
                body: raceRequest,
            },
        )
    })

    it('updates a race status with patch', async () => {
        const updatedRace: RaceResponse = {
            ...raceResponse,
            status: 'OPEN_FOR_REGISTRATION',
        }

        apiClient.mockResolvedValueOnce(updatedRace)

        await expect(
            updateRaceStatus(raceResponse.id, {
                status: 'OPEN_FOR_REGISTRATION',
            }),
        ).resolves.toEqual(updatedRace)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${raceResponse.id}/status`,
            {
                method: 'PATCH',
                body: {
                    status: 'OPEN_FOR_REGISTRATION',
                },
            },
        )
    })

    it('cancels a race with delete and without a request body', async () => {
        apiClient.mockResolvedValueOnce(undefined)

        await expect(cancelRace(raceResponse.id)).resolves.toBeUndefined()

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${raceResponse.id}`,
            {
                method: 'DELETE',
            },
        )
    })
})