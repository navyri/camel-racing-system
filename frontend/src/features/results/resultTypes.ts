export const resultStatuses = [
    'FINISHED',
    'DISQUALIFIED',
    'DID_NOT_FINISH',
    'DID_NOT_START',
] as const

export type ResultStatus = (typeof resultStatuses)[number]

export interface RaceResultResponse {
    id: string
    raceId: string
    raceName: string
    registrationId: string
    competitorId: string | null
    competitorName: string | null
    competitorNickname: string | null
    teamId: string | null
    teamName: string | null
    startingPosition: number | null
    finalPosition: number | null
    completionTimeSeconds: number | null
    penaltyTimeSeconds: number | null
    status: ResultStatus
    notes: string | null
    recordedByUserId: string
    recordedByUsername: string
    recordedAt: string
}

export interface RaceResultCreateRequest {
    registrationId: string
    completionTimeSeconds: number | null
    penaltyTimeSeconds: number | null
    status: ResultStatus
    notes: string | null
}

export interface RaceResultUpdateRequest {
    completionTimeSeconds: number | null
    penaltyTimeSeconds: number | null
    status: ResultStatus
    notes: string | null
}

export interface ResultFormValues {
    registrationId: string
    completionTimeSeconds: string
    penaltyTimeSeconds: string
    status: ResultStatus
    notes: string
}

export type ResultFormErrors = Record<string, string>

export function createEmptyResultFormValues(): ResultFormValues {
    return {
        registrationId: '',
        completionTimeSeconds: '',
        penaltyTimeSeconds: '0',
        status: 'FINISHED',
        notes: '',
    }
}

export function createResultFormValues(
    result: RaceResultResponse,
): ResultFormValues {
    return {
        registrationId: result.registrationId,
        completionTimeSeconds:
            result.completionTimeSeconds === null
                ? ''
                : String(result.completionTimeSeconds),
        penaltyTimeSeconds:
            result.penaltyTimeSeconds === null
                ? '0'
                : String(result.penaltyTimeSeconds),
        status: result.status,
        notes: result.notes ?? '',
    }
}

export function isFinishedResultStatus(status: ResultStatus): boolean {
    return status === 'FINISHED'
}

export function getResultStatusLabel(status: ResultStatus): string {
    const labels: Record<ResultStatus, string> = {
        FINISHED: 'Finished',
        DISQUALIFIED: 'Disqualified',
        DID_NOT_FINISH: 'Did not finish',
        DID_NOT_START: 'Did not start',
    }

    return labels[status]
}

export function getResultStatusClassName(status: ResultStatus): string {
    return `result-status-${status.toLowerCase().replaceAll('_', '-')}`
}

export function formatResultParticipant(
    result: RaceResultResponse,
): string {
    if (result.competitorName) {
        if (result.competitorNickname) {
            return `${result.competitorName} (${result.competitorNickname})`
        }

        return result.competitorName
    }

    if (result.teamName) {
        return result.teamName
    }

    return 'Unknown participant'
}

export function formatRegistrationParticipant(
    registration: {
        competitorName: string | null
        competitorNickname: string | null
        teamName: string | null
    },
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

export function validateResultForm(
    values: ResultFormValues,
    options: {
        requireRegistration: boolean
    },
): ResultFormErrors {
    const errors: ResultFormErrors = {}

    if (options.requireRegistration && values.registrationId.trim().length === 0) {
        errors.registrationId = 'Approved registration is required'
    }

    if (isFinishedResultStatus(values.status)) {
        const completionTimeSeconds = Number(values.completionTimeSeconds)
        const penaltyTimeSeconds = Number(values.penaltyTimeSeconds)

        if (values.completionTimeSeconds.trim().length === 0) {
            errors.completionTimeSeconds =
                'Completion time is required for finished results'
        } else if (
            !Number.isInteger(completionTimeSeconds) ||
            completionTimeSeconds <= 0
        ) {
            errors.completionTimeSeconds =
                'Completion time must be a positive whole number of seconds'
        }

        if (values.penaltyTimeSeconds.trim().length === 0) {
            errors.penaltyTimeSeconds =
                'Penalty time is required for finished results'
        } else if (
            !Number.isInteger(penaltyTimeSeconds) ||
            penaltyTimeSeconds < 0
        ) {
            errors.penaltyTimeSeconds =
                'Penalty time must be zero or a positive whole number of seconds'
        }
    }

    if (values.notes.trim().length > 1000) {
        errors.notes = 'Notes must not exceed 1000 characters'
    }

    return errors
}

export function toRaceResultCreateRequest(
    values: ResultFormValues,
): RaceResultCreateRequest {
    return {
        registrationId: values.registrationId,
        ...toRaceResultUpdateRequest(values),
    }
}

export function toRaceResultUpdateRequest(
    values: ResultFormValues,
): RaceResultUpdateRequest {
    const notes = values.notes.trim()

    if (!isFinishedResultStatus(values.status)) {
        return {
            completionTimeSeconds: null,
            penaltyTimeSeconds: null,
            status: values.status,
            notes: notes.length > 0 ? notes : null,
        }
    }

    return {
        completionTimeSeconds: Number(values.completionTimeSeconds),
        penaltyTimeSeconds: Number(values.penaltyTimeSeconds),
        status: values.status,
        notes: notes.length > 0 ? notes : null,
    }
}