export const raceStatuses = [
    'DRAFT',
    'OPEN_FOR_REGISTRATION',
    'CLOSED_FOR_REGISTRATION',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
] as const

export const raceTypes = ['INDIVIDUAL', 'TEAM', 'MIXED'] as const

export const raceSortFields = [
    'name',
    'scheduledAt',
    'registrationDeadline',
    'createdAt',
    'updatedAt',
    'maxParticipants',
] as const

export const sortDirections = ['asc', 'desc'] as const

export const defaultRacePage = 0
export const defaultRacePageSize = 10
export const defaultRaceSort = 'scheduledAt,asc'

export type RaceStatus = (typeof raceStatuses)[number]
export type RaceType = (typeof raceTypes)[number]
export type RaceSortField = (typeof raceSortFields)[number]
export type SortDirection = (typeof sortDirections)[number]

export interface RaceResponse {
    id: string
    name: string
    description: string
    scheduledAt: string
    startLocation: string
    finishLocation: string
    distanceMeters: number
    maxParticipants: number
    raceType: RaceType
    status: RaceStatus
    organizerId: string
    organizerUsername: string
    registrationDeadline: string
    createdAt: string
    updatedAt: string
}

export interface RaceRequest {
    name: string
    description: string
    scheduledAt: string
    startLocation: string
    finishLocation: string
    distanceMeters: number
    maxParticipants: number
    raceType: RaceType
    registrationDeadline: string
}

export interface RaceStatusRequest {
    status: RaceStatus
}

export interface RaceFormValues {
    name: string
    description: string
    scheduledAt: string
    startLocation: string
    finishLocation: string
    distanceMeters: string
    maxParticipants: string
    raceType: RaceType | ''
    registrationDeadline: string
}

export type RaceFormErrors = Record<string, string>

export interface PageResponse<T> {
    content: T[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
    empty: boolean
}

export interface RaceListFilters {
    status?: RaceStatus
    raceType?: RaceType
    search?: string
    page: number
    size: number
    sort: string
}

export interface RaceStatusTransition {
    currentStatus: RaceStatus
    nextStatus: RaceStatus
    actionLabel: string
    description: string
}

const raceStatusTransitions: Record<
    Exclude<RaceStatus, 'COMPLETED' | 'CANCELLED'>,
    RaceStatusTransition
> = {
    DRAFT: {
        currentStatus: 'DRAFT',
        nextStatus: 'OPEN_FOR_REGISTRATION',
        actionLabel: 'Open registration',
        description: 'This will allow eligible participants to register for the race.',
    },
    OPEN_FOR_REGISTRATION: {
        currentStatus: 'OPEN_FOR_REGISTRATION',
        nextStatus: 'CLOSED_FOR_REGISTRATION',
        actionLabel: 'Close registration',
        description: 'This will close registration for new participants.',
    },
    CLOSED_FOR_REGISTRATION: {
        currentStatus: 'CLOSED_FOR_REGISTRATION',
        nextStatus: 'IN_PROGRESS',
        actionLabel: 'Start race',
        description: 'This will mark the race as in progress.',
    },
    IN_PROGRESS: {
        currentStatus: 'IN_PROGRESS',
        nextStatus: 'COMPLETED',
        actionLabel: 'Complete race',
        description:
            'The race can only be completed when an official finished winner is recorded in first position.',
    },
}

export function createDefaultRaceListFilters(): RaceListFilters {
    return {
        page: defaultRacePage,
        size: defaultRacePageSize,
        sort: defaultRaceSort,
    }
}

export function createEmptyRaceFormValues(): RaceFormValues {
    return {
        name: '',
        description: '',
        scheduledAt: '',
        startLocation: '',
        finishLocation: '',
        distanceMeters: '',
        maxParticipants: '',
        raceType: '',
        registrationDeadline: '',
    }
}

export function createRaceFormValues(race: RaceResponse): RaceFormValues {
    return {
        name: race.name,
        description: race.description,
        scheduledAt: toDateTimeLocalValue(race.scheduledAt),
        startLocation: race.startLocation,
        finishLocation: race.finishLocation,
        distanceMeters: String(race.distanceMeters),
        maxParticipants: String(race.maxParticipants),
        raceType: race.raceType,
        registrationDeadline: toDateTimeLocalValue(race.registrationDeadline),
    }
}

export function isRaceStatus(value: string): value is RaceStatus {
    return raceStatuses.includes(value as RaceStatus)
}

export function isRaceType(value: string): value is RaceType {
    return raceTypes.includes(value as RaceType)
}

export function isRaceSortField(value: string): value is RaceSortField {
    return raceSortFields.includes(value as RaceSortField)
}

export function isSortDirection(value: string): value is SortDirection {
    return sortDirections.includes(value as SortDirection)
}

export function getAvailableRaceStatusTransition(
    status: RaceStatus,
): RaceStatusTransition | null {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
        return null
    }

    return raceStatusTransitions[status]
}

export function canCancelRace(status: RaceStatus): boolean {
    return (
        status === 'DRAFT' ||
        status === 'OPEN_FOR_REGISTRATION' ||
        status === 'CLOSED_FOR_REGISTRATION'
    )
}

export function isTerminalRaceStatus(status: RaceStatus): boolean {
    return status === 'COMPLETED' || status === 'CANCELLED'
}

export function validateRaceForm(
    values: RaceFormValues,
    now: Date = new Date(),
): RaceFormErrors {
    const errors: RaceFormErrors = {}

    validateRequiredText(
        values.name,
        'name',
        'Race name is required',
        'Race name must not exceed 150 characters',
        150,
        errors,
    )
    validateRequiredText(
        values.description,
        'description',
        'Description is required',
        'Description must not exceed 1000 characters',
        1000,
        errors,
    )
    validateRequiredText(
        values.startLocation,
        'startLocation',
        'Start location is required',
        'Start location must not exceed 200 characters',
        200,
        errors,
    )
    validateRequiredText(
        values.finishLocation,
        'finishLocation',
        'Finish location is required',
        'Finish location must not exceed 200 characters',
        200,
        errors,
    )

    const scheduledAt = validateFutureDateTime(
        values.scheduledAt,
        'scheduledAt',
        'Scheduled date is required',
        'Scheduled date must be in the future',
        now,
        errors,
    )
    const registrationDeadline = validateFutureDateTime(
        values.registrationDeadline,
        'registrationDeadline',
        'Registration deadline is required',
        'Registration deadline must be in the future',
        now,
        errors,
    )

    const distanceMeters = Number(values.distanceMeters)

    if (values.distanceMeters.trim().length === 0) {
        errors.distanceMeters = 'Distance is required'
    } else if (!Number.isFinite(distanceMeters) || distanceMeters < 0.01) {
        errors.distanceMeters = 'Distance must be greater than zero'
    }

    const maxParticipants = Number(values.maxParticipants)

    if (values.maxParticipants.trim().length === 0) {
        errors.maxParticipants = 'Maximum participants is required'
    } else if (
        !Number.isInteger(maxParticipants) ||
        maxParticipants < 2
    ) {
        errors.maxParticipants = 'Maximum participants must be at least 2'
    }

    if (!isRaceType(values.raceType)) {
        errors.raceType = 'Race type is required'
    }

    if (
        scheduledAt !== null &&
        registrationDeadline !== null &&
        registrationDeadline >= scheduledAt
    ) {
        errors.registrationDeadline =
            'Registration deadline must be before the scheduled date'
    }

    return errors
}

export function toRaceRequest(values: RaceFormValues): RaceRequest {
    return {
        name: values.name.trim(),
        description: values.description.trim(),
        scheduledAt: toLocalDateTimeValue(values.scheduledAt),
        startLocation: values.startLocation.trim(),
        finishLocation: values.finishLocation.trim(),
        distanceMeters: Number(values.distanceMeters),
        maxParticipants: Number(values.maxParticipants),
        raceType: values.raceType as RaceType,
        registrationDeadline: toLocalDateTimeValue(values.registrationDeadline),
    }
}

function validateRequiredText(
    value: string,
    field: string,
    requiredMessage: string,
    maxLengthMessage: string,
    maxLength: number,
    errors: RaceFormErrors,
) {
    const normalizedValue = value.trim()

    if (normalizedValue.length === 0) {
        errors[field] = requiredMessage
        return
    }

    if (normalizedValue.length > maxLength) {
        errors[field] = maxLengthMessage
    }
}

function validateFutureDateTime(
    value: string,
    field: string,
    requiredMessage: string,
    futureMessage: string,
    now: Date,
    errors: RaceFormErrors,
): number | null {
    if (value.trim().length === 0) {
        errors[field] = requiredMessage
        return null
    }

    const timestamp = new Date(value).getTime()

    if (Number.isNaN(timestamp) || timestamp <= now.getTime()) {
        errors[field] = futureMessage
        return null
    }

    return timestamp
}

function toDateTimeLocalValue(value: string): string {
    const normalizedValue = value.trim()

    if (normalizedValue.length === 0) {
        return ''
    }

    return normalizedValue.slice(0, 16)
}

function toLocalDateTimeValue(value: string): string {
    const normalizedValue = value.trim()

    if (normalizedValue.length === 16) {
        return `${normalizedValue}:00`
    }

    return normalizedValue
}