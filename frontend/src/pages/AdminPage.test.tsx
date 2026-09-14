import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/apiError'
import { getAuditLogs } from '../api/auditLogsApi'
import { AdminPage } from './AdminPage'

vi.mock('../api/auditLogsApi', () => ({
    getAuditLogs: vi.fn(),
}))

const mockedGetAuditLogs = vi.mocked(getAuditLogs)

function createAuditPage(
    overrides: Partial<{
        content: Array<{
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
        }>
        page: number
        size: number
        totalElements: number
        totalPages: number
        first: boolean
        last: boolean
        empty: boolean
    }> = {},
) {
    const content = overrides.content ?? [
        {
            id: 'audit-id',
            userId: 'admin-id',
            username: 'administrator',
            action: 'REGISTRATION_APPROVED',
            entityType: 'REGISTRATION',
            entityId: 'registration-id',
            description: 'Registration approved',
            previousValue: 'status=PENDING',
            newValue: 'status=APPROVED',
            createdAt: '2026-09-13T22:00:00',
        },
    ]

    return {
        content,
        page: overrides.page ?? 0,
        size: overrides.size ?? 10,
        totalElements: overrides.totalElements ?? content.length,
        totalPages:
            overrides.totalPages ?? (content.length > 0 ? 1 : 0),
        first: overrides.first ?? true,
        last: overrides.last ?? true,
        empty: overrides.empty ?? content.length === 0,
    }
}

describe('AdminPage', () => {
    it('loads and displays audit log records', async () => {
        mockedGetAuditLogs.mockResolvedValueOnce(createAuditPage())

        render(<AdminPage />)

        expect(
            screen.getByText('Loading audit logs...'),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('heading', {
                name: 'Administrative overview',
            }),
        ).toBeInTheDocument()

        expect(mockedGetAuditLogs).toHaveBeenCalledWith({
            page: 0,
            size: 10,
        })

        const table = screen.getByRole('table')

        expect(within(table).getByText('13/09/2026, 22:00')).toBeInTheDocument()
        expect(within(table).getByText('administrator')).toBeInTheDocument()
        expect(
            within(table).getByText('Registration Approved'),
        ).toBeInTheDocument()
        expect(
            within(table).getByText('REGISTRATION: registration-id'),
        ).toBeInTheDocument()
        expect(
            within(table).getByText('Registration approved'),
        ).toBeInTheDocument()
        expect(within(table).getByText('status=PENDING')).toBeInTheDocument()
        expect(within(table).getByText('status=APPROVED')).toBeInTheDocument()
    })

    it('shows empty state when no audit logs exist', async () => {
        mockedGetAuditLogs.mockResolvedValueOnce(
            createAuditPage({
                content: [],
                totalElements: 0,
                totalPages: 0,
                empty: true,
            }),
        )

        render(<AdminPage />)

        expect(
            await screen.findByRole('heading', {
                name: 'No audit logs found',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Administrative activity will appear here when records are available.',
            ),
        ).toBeInTheDocument()
    })

    it('shows an authorization error and retries audit log loading', async () => {
        mockedGetAuditLogs
            .mockRejectedValueOnce(
                new ApiError('Access denied', 403),
            )
            .mockResolvedValueOnce(createAuditPage())

        render(<AdminPage />)

        expect(
            await screen.findByText(
                'You do not have permission to view audit logs.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        await waitFor(() => {
            expect(mockedGetAuditLogs).toHaveBeenCalledTimes(2)
        })

        expect(
            await screen.findByRole('table'),
        ).toBeInTheDocument()
    })

    it('changes page size and returns to the first page', async () => {
        mockedGetAuditLogs
            .mockResolvedValueOnce(
                createAuditPage({
                    page: 1,
                    size: 10,
                    totalElements: 20,
                    totalPages: 2,
                    first: false,
                    last: true,
                }),
            )
            .mockResolvedValueOnce(
                createAuditPage({
                    page: 0,
                    size: 25,
                    totalElements: 20,
                    totalPages: 1,
                    first: true,
                    last: true,
                }),
            )

        render(<AdminPage />)

        await screen.findByRole('table')

        fireEvent.change(screen.getByLabelText('Results per page'), {
            target: {
                value: '25',
            },
        })

        await waitFor(() => {
            expect(mockedGetAuditLogs).toHaveBeenLastCalledWith({
                page: 0,
                size: 25,
            })
        })
    })

    it('moves to the next audit log page', async () => {
        mockedGetAuditLogs
            .mockResolvedValueOnce(
                createAuditPage({
                    page: 0,
                    size: 10,
                    totalElements: 20,
                    totalPages: 2,
                    first: true,
                    last: false,
                }),
            )
            .mockResolvedValueOnce(
                createAuditPage({
                    page: 1,
                    size: 10,
                    totalElements: 20,
                    totalPages: 2,
                    first: false,
                    last: true,
                }),
            )

        render(<AdminPage />)

        await screen.findByRole('table')

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => {
            expect(mockedGetAuditLogs).toHaveBeenLastCalledWith({
                page: 1,
                size: 10,
            })
        })
    })
})