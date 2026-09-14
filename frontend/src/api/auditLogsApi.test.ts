import { describe, expect, it, vi } from 'vitest'

const apiClient = vi.fn()

vi.mock('./apiClient', () => ({
    apiClient,
}))

const { getAuditLogs } = await import('./auditLogsApi')

describe('auditLogsApi', () => {
    it('gets audit logs with pagination parameters', async () => {
        const response = {
            content: [],
            page: 1,
            size: 25,
            totalElements: 0,
            totalPages: 0,
            first: false,
            last: true,
            empty: true,
        }

        apiClient.mockResolvedValueOnce(response)

        await expect(
            getAuditLogs({
                page: 1,
                size: 25,
            }),
        ).resolves.toEqual(response)

        expect(apiClient).toHaveBeenCalledWith(
            '/api/audit-logs?page=1&size=25',
            {
                method: 'GET',
            },
        )
    })

    it('gets audit logs without optional query parameters', async () => {
        apiClient.mockResolvedValueOnce({
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
        })

        await getAuditLogs()

        expect(apiClient).toHaveBeenCalledWith('/api/audit-logs', {
            method: 'GET',
        })
    })
})