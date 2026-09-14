import { describe, expect, it, vi } from 'vitest'
import {
    createDefaultCompetitorListFilters,
    type CompetitorRequest,
    type CompetitorResponse,
    type PageResponse,
} from '../features/competitors/competitorTypes'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const {
    createCompetitor,
    getCompetitorById,
    getCompetitors,
    retireCompetitor,
    updateCompetitor,
    updateCompetitorStatus,
} = await import('./competitorsApi')

const competitorResponse: CompetitorResponse = {
    id: 'b0f7e000-14c4-486c-8b6d-032af41f0e75',
    name: 'Byte',
    nickname: 'ByteTheCamel',
    competitorType: 'CAMEL',
    dateOfBirth: '2016-05-20',
    approximateAge: null,
    weightKg: 400,
    heightCm: 220,
    origin: 'Colombia',
    status: 'ACTIVE',
    registrationDate: '2026-09-13T03:00:00',
    victories: 0,
    defeats: 0,
    completedRaces: 0,
}

const competitorRequest: CompetitorRequest = {
    name: 'Byte',
    nickname: 'ByteTheCamel',
    competitorType: 'CAMEL',
    dateOfBirth: '2016-05-20',
    approximateAge: null,
    weightKg: 400,
    heightCm: 220,
    origin: 'Colombia',
}

const pageResponse: PageResponse<CompetitorResponse> = {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
}

describe('competitorsApi', () => {
    it('uses the default paginated endpoint contract', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await expect(
            getCompetitors(createDefaultCompetitorListFilters()),
        ).resolves.toEqual(pageResponse)

        expect(apiClient).toHaveBeenCalledWith(
            '/api/competitors?page=0&size=10&sort=name%2Casc',
            {
                method: 'GET',
            },
        )
    })

    it('includes populated filters and trims text values', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await getCompetitors({
            type: 'CAMEL',
            status: 'ACTIVE',
            origin: '  Colombia  ',
            search: '  Byte  ',
            page: 2,
            size: 25,
            sort: 'nickname,desc',
        })

        expect(apiClient).toHaveBeenCalledWith(
            '/api/competitors?type=CAMEL&status=ACTIVE&origin=Colombia&search=Byte&page=2&size=25&sort=nickname%2Cdesc',
            {
                method: 'GET',
            },
        )
    })

    it('omits empty optional filters', async () => {
        apiClient.mockResolvedValueOnce(pageResponse)

        await getCompetitors({
            page: 0,
            size: 50,
            sort: 'registrationDate,asc',
            origin: '   ',
            search: '   ',
        })

        expect(apiClient).toHaveBeenCalledWith(
            '/api/competitors?page=0&size=50&sort=registrationDate%2Casc',
            {
                method: 'GET',
            },
        )
    })

    it('gets a competitor by id', async () => {
        apiClient.mockResolvedValueOnce(competitorResponse)

        await expect(
            getCompetitorById(competitorResponse.id),
        ).resolves.toEqual(competitorResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/competitors/${competitorResponse.id}`,
            {
                method: 'GET',
            },
        )
    })

    it('creates a competitor with the audited request contract', async () => {
        apiClient.mockResolvedValueOnce(competitorResponse)

        await expect(
            createCompetitor(competitorRequest),
        ).resolves.toEqual(competitorResponse)

        expect(apiClient).toHaveBeenCalledWith('/api/competitors', {
            method: 'POST',
            body: competitorRequest,
        })
    })

    it('updates a competitor with put and the audited request contract', async () => {
        apiClient.mockResolvedValueOnce(competitorResponse)

        await expect(
            updateCompetitor(competitorResponse.id, competitorRequest),
        ).resolves.toEqual(competitorResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/competitors/${competitorResponse.id}`,
            {
                method: 'PUT',
                body: competitorRequest,
            },
        )
    })

    it('updates competitor status with patch', async () => {
        const updatedCompetitor: CompetitorResponse = {
            ...competitorResponse,
            status: 'INJURED',
        }

        apiClient.mockResolvedValueOnce(updatedCompetitor)

        await expect(
            updateCompetitorStatus(competitorResponse.id, {
                status: 'INJURED',
            }),
        ).resolves.toEqual(updatedCompetitor)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/competitors/${competitorResponse.id}/status`,
            {
                method: 'PATCH',
                body: {
                    status: 'INJURED',
                },
            },
        )
    })

    it('retires a competitor with delete and without a request body', async () => {
        apiClient.mockResolvedValueOnce(undefined)

        await expect(
            retireCompetitor(competitorResponse.id),
        ).resolves.toBeUndefined()

        expect(apiClient).toHaveBeenCalledWith(
            `/api/competitors/${competitorResponse.id}`,
            {
                method: 'DELETE',
            },
        )
    })
})