import { apiClient } from './apiClient'
import type {
    RegistrationApprovalRequest,
    RegistrationRequest,
    RegistrationResponse,
} from '../features/registrations/registrationTypes'

export function getRegistrationsByRaceId(
    raceId: string,
): Promise<RegistrationResponse[]> {
    return apiClient<RegistrationResponse[]>(
        `/api/races/${encodeURIComponent(raceId)}/registrations`,
        {
            method: 'GET',
        },
    )
}

export function createRegistration(
    raceId: string,
    request: RegistrationRequest,
): Promise<RegistrationResponse> {
    return apiClient<RegistrationResponse>(
        `/api/races/${encodeURIComponent(raceId)}/registrations`,
        {
            method: 'POST',
            body: request,
        },
    )
}

export function approveRegistration(
    registrationId: string,
    request: RegistrationApprovalRequest,
): Promise<RegistrationResponse> {
    return apiClient<RegistrationResponse>(
        `/api/registrations/${encodeURIComponent(registrationId)}/approve`,
        {
            method: 'PATCH',
            body: request,
        },
    )
}

export function rejectRegistration(
    registrationId: string,
    reason: string,
): Promise<RegistrationResponse> {
    return apiClient<RegistrationResponse>(
        `/api/registrations/${encodeURIComponent(registrationId)}/reject`,
        {
            method: 'PATCH',
            body: {
                reason,
            },
        },
    )
}

export async function cancelRegistration(
    registrationId: string,
): Promise<void> {
    await apiClient<void>(
        `/api/registrations/${encodeURIComponent(registrationId)}`,
        {
            method: 'DELETE',
        },
    )
}