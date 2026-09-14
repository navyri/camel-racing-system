import { apiClient } from './apiClient'
import type { PageResponse } from '../features/races/raceTypes'
import type { AuditLogResponse } from '../features/audit/auditTypes'

export interface GetAuditLogsParams {
    page?: number
    size?: number
}

function buildAuditLogsPath(params: GetAuditLogsParams): string {
    const query = new URLSearchParams()

    if (params.page !== undefined) {
        query.set('page', String(params.page))
    }

    if (params.size !== undefined) {
        query.set('size', String(params.size))
    }

    const queryString = query.toString()

    return queryString.length > 0
        ? `/api/audit-logs?${queryString}`
        : '/api/audit-logs'
}

export function getAuditLogs(
    params: GetAuditLogsParams = {},
): Promise<PageResponse<AuditLogResponse>> {
    return apiClient<PageResponse<AuditLogResponse>>(
        buildAuditLogsPath(params),
        {
            method: 'GET',
        },
    )
}