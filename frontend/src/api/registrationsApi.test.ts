import { describe, expect, it, vi } from 'vitest'
import type {
    RegistrationApprovalRequest,
    RegistrationRequest,
    RegistrationResponse,
} from '../features/registrations/registrationTypes'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const {
    approveRegistration,
    cancelRegistration,
    createRegistration,
    getRegistrationsByRaceId,
    rejectRegistration,
} = await import('./registrationsApi')

const registrationResponse: RegistrationResponse = {
    id: 'registration-id',
    raceId: 'race-id',
    competitorId: 'competitor-id',
    competitorName: 'Byte',
    competitorNickname: 'ByteTheCamel',
    teamId: null,
    teamName: null,
    registeredAt: '2026-09-13T07:45:00',
    status: 'PENDING',
    startingPosition: null,
    validationNotes: null,
    registeredByUserId: 'organizer-id',
    registeredByUsername: 'organizer',
}

const registrationRequest: RegistrationRequest = {
    competitorId: 'competitor-id',
    teamId: null,
    startingPosition: null,
}

const teamRegistrationRequest: RegistrationRequest = {
    competitorId: null,
    teamId: 'team-id',
    startingPosition: null,
}

const registrationApprovalRequest: RegistrationApprovalRequest = {
    startingPosition: 1,
}

describe('registrationsApi', () => {
    it('lists registrations for a race', async () => {
        apiClient.mockResolvedValueOnce([registrationResponse])

        await expect(
            getRegistrationsByRaceId(registrationResponse.raceId),
        ).resolves.toEqual([registrationResponse])

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${registrationResponse.raceId}/registrations`,
            {
                method: 'GET',
            },
        )
    })

    it('creates an individual registration without starting position', async () => {
        apiClient.mockResolvedValueOnce(registrationResponse)

        await expect(
            createRegistration(
                registrationResponse.raceId,
                registrationRequest,
            ),
        ).resolves.toEqual(registrationResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${registrationResponse.raceId}/registrations`,
            {
                method: 'POST',
                body: registrationRequest,
            },
        )
    })

    it('creates a team registration without starting position', async () => {
        const teamRegistrationResponse: RegistrationResponse = {
            ...registrationResponse,
            competitorId: null,
            competitorName: null,
            competitorNickname: null,
            teamId: 'team-id',
            teamName: 'Desert Riders',
        }

        apiClient.mockResolvedValueOnce(teamRegistrationResponse)

        await expect(
            createRegistration(
                teamRegistrationResponse.raceId,
                teamRegistrationRequest,
            ),
        ).resolves.toEqual(teamRegistrationResponse)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/races/${teamRegistrationResponse.raceId}/registrations`,
            {
                method: 'POST',
                body: {
                    competitorId: null,
                    teamId: 'team-id',
                    startingPosition: null,
                },
            },
        )
    })

    it('approves a registration with a starting position', async () => {
        const approvedRegistration: RegistrationResponse = {
            ...registrationResponse,
            status: 'APPROVED',
            startingPosition: 1,
        }

        apiClient.mockResolvedValueOnce(approvedRegistration)

        await expect(
            approveRegistration(
                registrationResponse.id,
                registrationApprovalRequest,
            ),
        ).resolves.toEqual(approvedRegistration)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/registrations/${registrationResponse.id}/approve`,
            {
                method: 'PATCH',
                body: registrationApprovalRequest,
            },
        )
    })

    it('rejects a registration with a reason', async () => {
        const rejectedRegistration: RegistrationResponse = {
            ...registrationResponse,
            status: 'REJECTED',
            validationNotes: 'Medical document is missing.',
        }

        apiClient.mockResolvedValueOnce(rejectedRegistration)

        await expect(
            rejectRegistration(
                registrationResponse.id,
                'Medical document is missing.',
            ),
        ).resolves.toEqual(rejectedRegistration)

        expect(apiClient).toHaveBeenCalledWith(
            `/api/registrations/${registrationResponse.id}/reject`,
            {
                method: 'PATCH',
                body: {
                    reason: 'Medical document is missing.',
                },
            },
        )
    })

    it('cancels a registration without a request body', async () => {
        apiClient.mockResolvedValueOnce(undefined)

        await expect(
            cancelRegistration(registrationResponse.id),
        ).resolves.toBeUndefined()

        expect(apiClient).toHaveBeenCalledWith(
            `/api/registrations/${registrationResponse.id}`,
            {
                method: 'DELETE',
            },
        )
    })
})