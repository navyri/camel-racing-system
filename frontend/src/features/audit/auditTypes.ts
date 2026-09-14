export interface AuditLogResponse {
    id: string
    userId: string | null
    username: string | null
    action: string
    entityType: string
    entityId: string | null
    description: string | null
    previousValue: string | null
    newValue: string | null
    createdAt: string
}

export const auditLogPageSizes = [5, 10, 25, 50, 100]

export function formatAuditValue(value: string | null): string {
    return value && value.trim().length > 0 ? value : 'No value'
}

export function formatAuditUser(
    username: string | null,
    userId: string | null,
): string {
    if (username && username.trim().length > 0) {
        return username
    }

    if (userId) {
        return userId
    }

    return 'System'
}

export function formatAuditEntity(
    entityType: string,
    entityId: string | null,
): string {
    if (!entityId) {
        return entityType
    }

    return `${entityType}: ${entityId}`
}

export function formatAuditAction(action: string): string {
    return action
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}