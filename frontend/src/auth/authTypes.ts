export const appRoles = [
    'ADMINISTRATOR',
    'RACE_ORGANIZER',
    'VIEWER',
] as const

export type AppRole = (typeof appRoles)[number]

export interface AuthUser {
    username: string
    displayName: string
    email?: string
    roles: AppRole[]
}

export interface AuthState {
    initialized: boolean
    authenticated: boolean
    user: AuthUser | null
}

export function isAppRole(value: string): value is AppRole {
    return appRoles.includes(value as AppRole)
}

export function getAppRoles(realmRoles: string[] = []): AppRole[] {
    return realmRoles.filter(isAppRole)
}