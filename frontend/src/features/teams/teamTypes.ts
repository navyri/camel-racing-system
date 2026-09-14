export const teamStatuses = ['ACTIVE', 'SUSPENDED', 'INACTIVE'] as const

export type TeamStatus = (typeof teamStatuses)[number]

export type TeamSortField = 'name' | 'createdAt' | 'victories' | 'defeats'

export type SortDirection = 'asc' | 'desc'

export interface TeamRequest {
    name: string
    description: string
    coachName: string
}

export interface TeamMemberResponse {
    competitorId: string
    name: string
    nickname: string
    competitorType: string
    joinedAt: string
}

export interface TeamSummaryResponse {
    id: string
    name: string
    description: string
    coachName: string
    status: TeamStatus
    createdAt: string
    victories: number
    defeats: number
}

export interface TeamResponse extends TeamSummaryResponse {
    members: TeamMemberResponse[]
}

export interface TeamPageResponse {
    content: TeamSummaryResponse[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    first: boolean
    last: boolean
}

export interface TeamFiltersState {
    status: TeamStatus | ''
    search: string
    page: number
    size: number
    sort: string
}

export interface TeamFormValues {
    name: string
    description: string
    coachName: string
}

export type TeamFormErrors = Partial<Record<keyof TeamFormValues, string>>

export const defaultTeamFilters: TeamFiltersState = {
    status: '',
    search: '',
    page: 0,
    size: 10,
    sort: 'name,asc',
}

export const teamSortFields: Array<{
    value: string
    label: string
}> = [
        {
            value: 'name,asc',
            label: 'Name A to Z',
        },
        {
            value: 'name,desc',
            label: 'Name Z to A',
        },
        {
            value: 'createdAt,desc',
            label: 'Newest first',
        },
        {
            value: 'createdAt,asc',
            label: 'Oldest first',
        },
        {
            value: 'victories,desc',
            label: 'Most victories',
        },
        {
            value: 'defeats,asc',
            label: 'Fewest defeats',
        },
    ]

export const teamPageSizes = [5, 10, 25, 50, 100]

export function getTeamStatusLabel(status: TeamStatus): string {
    const labels: Record<TeamStatus, string> = {
        ACTIVE: 'Active',
        SUSPENDED: 'Suspended',
        INACTIVE: 'Inactive',
    }

    return labels[status]
}

export function getTeamStatusClassName(status: TeamStatus): string {
    return `team-status-${status.toLowerCase()}`
}

export function getTeamRecordLabel(
    victories: number,
    defeats: number,
): string {
    return `${victories} victories - ${defeats} defeats`
}

export function createEmptyTeamFormValues(): TeamFormValues {
    return {
        name: '',
        description: '',
        coachName: '',
    }
}

export function toTeamFormValues(team: TeamResponse): TeamFormValues {
    return {
        name: team.name,
        description: team.description,
        coachName: team.coachName,
    }
}

export function validateTeamForm(
    values: TeamFormValues,
): TeamFormErrors {
    const errors: TeamFormErrors = {}

    const name = values.name.trim()
    const description = values.description.trim()
    const coachName = values.coachName.trim()

    if (!name) {
        errors.name = 'Team name is required'
    } else if (name.length > 150) {
        errors.name = 'Team name must not exceed 150 characters'
    }

    if (!description) {
        errors.description = 'Description is required'
    } else if (description.length > 500) {
        errors.description = 'Description must not exceed 500 characters'
    }

    if (!coachName) {
        errors.coachName = 'Coach name is required'
    } else if (coachName.length > 150) {
        errors.coachName = 'Coach name must not exceed 150 characters'
    }

    return errors
}

export function toTeamRequest(values: TeamFormValues): TeamRequest {
    return {
        name: values.name.trim(),
        description: values.description.trim(),
        coachName: values.coachName.trim(),
    }
}