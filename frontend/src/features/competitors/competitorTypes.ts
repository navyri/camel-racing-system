export const competitorStatuses = [
    'ACTIVE',
    'INJURED',
    'SUSPENDED',
    'RETIRED',
] as const

export const competitorTypes = [
    'DWARF',
    'CAMEL',
    'MEDIUM',
    'OTHER',
] as const

export const competitorSortFields = [
    'name',
    'nickname',
    'registrationDate',
    'victories',
    'defeats',
    'completedRaces',
] as const

export const sortDirections = ['asc', 'desc'] as const

export const defaultCompetitorPage = 0
export const defaultCompetitorPageSize = 10
export const defaultCompetitorSort = 'name,asc'

export type CompetitorStatus = (typeof competitorStatuses)[number]
export type CompetitorType = (typeof competitorTypes)[number]
export type CompetitorSortField = (typeof competitorSortFields)[number]
export type SortDirection = (typeof sortDirections)[number]

export interface CompetitorResponse {
    id: string
    name: string
    nickname: string
    competitorType: CompetitorType
    dateOfBirth: string | null
    approximateAge: number | null
    weightKg: number
    heightCm: number
    origin: string
    status: CompetitorStatus
    registrationDate: string
    victories: number
    defeats: number
    completedRaces: number
}

export interface CompetitorRequest {
    name: string
    nickname: string
    competitorType: CompetitorType
    dateOfBirth: string | null
    approximateAge: number | null
    weightKg: number
    heightCm: number
    origin: string
}

export interface CompetitorStatusRequest {
    status: CompetitorStatus
}

export type AgeReferenceType = 'dateOfBirth' | 'approximateAge'

export interface CompetitorFormValues {
    name: string
    nickname: string
    competitorType: CompetitorType | ''
    ageReferenceType: AgeReferenceType
    dateOfBirth: string
    approximateAge: string
    weightKg: string
    heightCm: string
    origin: string
}

export type CompetitorFormErrors = Record<string, string>

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

export interface CompetitorListFilters {
    type?: CompetitorType
    status?: CompetitorStatus
    origin?: string
    search?: string
    page: number
    size: number
    sort: string
}

export interface CompetitorStatusOption {
    status: CompetitorStatus
    actionLabel: string
    description: string
}

const competitorStatusOptions: Record<
    Exclude<CompetitorStatus, 'RETIRED'>,
    CompetitorStatusOption[]
> = {
    ACTIVE: [
        {
            status: 'INJURED',
            actionLabel: 'Mark as injured',
            description:
                'This will mark the competitor as injured and unavailable for new registrations.',
        },
        {
            status: 'SUSPENDED',
            actionLabel: 'Suspend competitor',
            description:
                'This will suspend the competitor and prevent new race registrations.',
        },
    ],
    INJURED: [
        {
            status: 'ACTIVE',
            actionLabel: 'Mark as active',
            description:
                'This will mark the competitor as active and eligible for new registrations.',
        },
        {
            status: 'SUSPENDED',
            actionLabel: 'Suspend competitor',
            description:
                'This will suspend the competitor and prevent new race registrations.',
        },
    ],
    SUSPENDED: [
        {
            status: 'ACTIVE',
            actionLabel: 'Mark as active',
            description:
                'This will mark the competitor as active and eligible for new registrations.',
        },
        {
            status: 'INJURED',
            actionLabel: 'Mark as injured',
            description:
                'This will mark the competitor as injured and unavailable for new registrations.',
        },
    ],
}

export function createDefaultCompetitorListFilters(): CompetitorListFilters {
    return {
        page: defaultCompetitorPage,
        size: defaultCompetitorPageSize,
        sort: defaultCompetitorSort,
    }
}

export function createEmptyCompetitorFormValues(): CompetitorFormValues {
    return {
        name: '',
        nickname: '',
        competitorType: '',
        ageReferenceType: 'dateOfBirth',
        dateOfBirth: '',
        approximateAge: '',
        weightKg: '',
        heightCm: '',
        origin: '',
    }
}

export function createCompetitorFormValues(
    competitor: CompetitorResponse,
): CompetitorFormValues {
    return {
        name: competitor.name,
        nickname: competitor.nickname,
        competitorType: competitor.competitorType,
        ageReferenceType:
            competitor.dateOfBirth !== null
                ? 'dateOfBirth'
                : 'approximateAge',
        dateOfBirth: competitor.dateOfBirth ?? '',
        approximateAge:
            competitor.approximateAge === null
                ? ''
                : String(competitor.approximateAge),
        weightKg: String(competitor.weightKg),
        heightCm: String(competitor.heightCm),
        origin: competitor.origin,
    }
}

export function isCompetitorStatus(value: string): value is CompetitorStatus {
    return competitorStatuses.includes(value as CompetitorStatus)
}

export function isCompetitorType(value: string): value is CompetitorType {
    return competitorTypes.includes(value as CompetitorType)
}

export function isCompetitorSortField(
    value: string,
): value is CompetitorSortField {
    return competitorSortFields.includes(value as CompetitorSortField)
}

export function isSortDirection(value: string): value is SortDirection {
    return sortDirections.includes(value as SortDirection)
}

export function isRetiredCompetitor(
    status: CompetitorStatus,
): boolean {
    return status === 'RETIRED'
}

export function getCompetitorStatusOptions(
    status: CompetitorStatus,
): CompetitorStatusOption[] {
    if (status === 'RETIRED') {
        return []
    }

    return competitorStatusOptions[status]
}

export function validateCompetitorForm(
    values: CompetitorFormValues,
    today: Date = new Date(),
): CompetitorFormErrors {
    const errors: CompetitorFormErrors = {}

    validateRequiredText(
        values.name,
        'name',
        'Name is required',
        'Name must not exceed 150 characters',
        150,
        errors,
    )
    validateRequiredText(
        values.nickname,
        'nickname',
        'Nickname is required',
        'Nickname must not exceed 100 characters',
        100,
        errors,
    )
    validateRequiredText(
        values.origin,
        'origin',
        'Origin is required',
        'Origin must not exceed 100 characters',
        100,
        errors,
    )

    if (!isCompetitorType(values.competitorType)) {
        errors.competitorType = 'Competitor type is required'
    }

    if (values.ageReferenceType === 'dateOfBirth') {
        validateDateOfBirth(values.dateOfBirth, today, errors)
    } else {
        validateApproximateAge(values.approximateAge, errors)
    }

    validatePositiveDecimal(
        values.weightKg,
        'weightKg',
        'Weight is required',
        'Weight must be greater than zero',
        errors,
    )
    validatePositiveDecimal(
        values.heightCm,
        'heightCm',
        'Height is required',
        'Height must be greater than zero',
        errors,
    )

    return errors
}

export function toCompetitorRequest(
    values: CompetitorFormValues,
): CompetitorRequest {
    const useDateOfBirth = values.ageReferenceType === 'dateOfBirth'

    return {
        name: values.name.trim(),
        nickname: values.nickname.trim(),
        competitorType: values.competitorType as CompetitorType,
        dateOfBirth: useDateOfBirth ? values.dateOfBirth.trim() : null,
        approximateAge: useDateOfBirth
            ? null
            : Number(values.approximateAge),
        weightKg: Number(values.weightKg),
        heightCm: Number(values.heightCm),
        origin: values.origin.trim(),
    }
}

export function setCompetitorAgeReferenceType(
    values: CompetitorFormValues,
    ageReferenceType: AgeReferenceType,
): CompetitorFormValues {
    if (ageReferenceType === 'dateOfBirth') {
        return {
            ...values,
            ageReferenceType,
            approximateAge: '',
        }
    }

    return {
        ...values,
        ageReferenceType,
        dateOfBirth: '',
    }
}

function validateRequiredText(
    value: string,
    field: string,
    requiredMessage: string,
    maxLengthMessage: string,
    maxLength: number,
    errors: CompetitorFormErrors,
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

function validateDateOfBirth(
    value: string,
    today: Date,
    errors: CompetitorFormErrors,
) {
    if (value.trim().length === 0) {
        errors.dateOfBirth = 'Date of birth is required'
        return
    }

    const dateOfBirth = new Date(`${value}T00:00:00`)

    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth >= startOfDay(today)) {
        errors.dateOfBirth = 'Date of birth must be in the past'
    }
}

function validateApproximateAge(
    value: string,
    errors: CompetitorFormErrors,
) {
    if (value.trim().length === 0) {
        errors.approximateAge = 'Approximate age is required'
        return
    }

    const approximateAge = Number(value)

    if (!Number.isInteger(approximateAge) || approximateAge <= 0) {
        errors.approximateAge = 'Approximate age must be positive'
    }
}

function validatePositiveDecimal(
    value: string,
    field: string,
    requiredMessage: string,
    invalidMessage: string,
    errors: CompetitorFormErrors,
) {
    if (value.trim().length === 0) {
        errors[field] = requiredMessage
        return
    }

    const numberValue = Number(value)

    if (!Number.isFinite(numberValue) || numberValue < 0.01) {
        errors[field] = invalidMessage
    }
}

function startOfDay(value: Date): Date {
    return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
    )
}