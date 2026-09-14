export const registrationStatuses = [
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
] as const

export const registrationParticipantModes = [
    'INDIVIDUAL',
    'TEAM',
] as const

export type RegistrationStatus = (typeof registrationStatuses)[number]
export type RegistrationParticipantMode =
    (typeof registrationParticipantModes)[number]

export interface RegistrationResponse {
    id: string
    raceId: string
    competitorId: string | null
    competitorName: string | null
    competitorNickname: string | null
    teamId: string | null
    teamName: string | null
    registeredAt: string
    status: RegistrationStatus
    startingPosition: number | null
    validationNotes: string | null
    registeredByUserId: string
    registeredByUsername: string
}

export interface RegistrationRequest {
    competitorId: string | null
    teamId: string | null
    startingPosition: null
}

export interface RegistrationApprovalRequest {
    startingPosition: number
}

export interface RegistrationFormValues {
    participantMode: RegistrationParticipantMode
    competitorId: string
    teamId: string
}

export interface RegistrationApprovalFormValues {
    startingPosition: string
}

export type RegistrationFormErrors = Record<string, string>

export function createEmptyRegistrationFormValues(): RegistrationFormValues {
    return {
        participantMode: 'INDIVIDUAL',
        competitorId: '',
        teamId: '',
    }
}

export function createEmptyRegistrationApprovalFormValues(): RegistrationApprovalFormValues {
    return {
        startingPosition: '',
    }
}

export function validateRegistrationForm(
    values: RegistrationFormValues,
): RegistrationFormErrors {
    const errors: RegistrationFormErrors = {}

    if (values.participantMode === 'INDIVIDUAL') {
        if (values.competitorId.trim().length === 0) {
            errors.competitorId = 'Competitor is required'
        }

        return errors
    }

    if (values.teamId.trim().length === 0) {
        errors.teamId = 'Team is required'
    }

    return errors
}

export function validateRegistrationApprovalForm(
    values: RegistrationApprovalFormValues,
): RegistrationFormErrors {
    const errors: RegistrationFormErrors = {}

    if (values.startingPosition.trim().length === 0) {
        errors.startingPosition = 'Starting position is required'
    }

    return errors
}

export function toRegistrationRequest(
    values: RegistrationFormValues,
): RegistrationRequest {
    if (values.participantMode === 'TEAM') {
        return {
            competitorId: null,
            teamId: values.teamId.trim(),
            startingPosition: null,
        }
    }

    return {
        competitorId: values.competitorId.trim(),
        teamId: null,
        startingPosition: null,
    }
}

export function toRegistrationApprovalRequest(
    values: RegistrationApprovalFormValues,
): RegistrationApprovalRequest {
    return {
        startingPosition: Number(values.startingPosition),
    }
}

export function formatRegistrationStatus(
    status: RegistrationStatus,
): string {
    return status.charAt(0) + status.slice(1).toLowerCase()
}

export function canApproveRegistration(
    status: RegistrationStatus,
): boolean {
    return status === 'PENDING'
}

export function canRejectRegistration(
    status: RegistrationStatus,
): boolean {
    return status === 'PENDING'
}

export function canCancelRegistration(
    status: RegistrationStatus,
): boolean {
    return status === 'PENDING' || status === 'APPROVED'
}

export function canCreateIndividualRegistration(
    raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED',
    raceStatus: string,
): boolean {
    return (
        (raceType === 'INDIVIDUAL' || raceType === 'MIXED') &&
        raceStatus === 'OPEN_FOR_REGISTRATION'
    )
}

export function canCreateTeamRegistration(
    raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED',
    raceStatus: string,
): boolean {
    return (
        (raceType === 'TEAM' || raceType === 'MIXED') &&
        raceStatus === 'OPEN_FOR_REGISTRATION'
    )
}

export function canCreateRegistration(
    raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED',
    raceStatus: string,
): boolean {
    return (
        canCreateIndividualRegistration(raceType, raceStatus) ||
        canCreateTeamRegistration(raceType, raceStatus)
    )
}

export function getRegistrationParticipantLabel(
    registration: RegistrationResponse,
): string {
    if (registration.competitorName) {
        if (registration.competitorNickname) {
            return `${registration.competitorName} (${registration.competitorNickname})`
        }

        return registration.competitorName
    }

    if (registration.teamName) {
        return registration.teamName
    }

    return 'Unknown participant'
}