import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/apiError'
import { getAuditLogs } from '../api/auditLogsApi'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'
import { AuditLogPagination } from '../features/audit/AuditLogPagination'
import {
    auditLogPageSizes,
    formatAuditAction,
    formatAuditEntity,
    formatAuditUser,
    formatAuditValue,
    type AuditLogResponse,
} from '../features/audit/auditTypes'
import type { PageResponse } from '../features/races/raceTypes'
import { formatDateTime } from '../utils/dateFormat'

function createEmptyAuditLogPage(
    page: number,
    size: number,
): PageResponse<AuditLogResponse> {
    return {
        content: [],
        page,
        size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        empty: true,
    }
}

function getAdminErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load audit logs. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view audit logs.'
    }

    if (error.status === 404) {
        return 'The audit log service was not found.'
    }

    if (error.status >= 500) {
        return 'The audit log service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load audit logs. Please try again.'
}

export function AdminPage() {
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(10)
    const [auditLogPage, setAuditLogPage] = useState<
        PageResponse<AuditLogResponse>
    >(() => createEmptyAuditLogPage(0, 10))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        let active = true

        void getAuditLogs({
            page,
            size,
        })
            .then((response) => {
                if (active) {
                    setAuditLogPage(response)
                    setError(null)
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setError(getAdminErrorMessage(reason))
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false)
                }
            })

        return () => {
            active = false
        }
    }, [page, requestVersion, size])

    function handleRetry() {
        setLoading(true)
        setError(null)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    function handleSizeChange(event: React.ChangeEvent<HTMLSelectElement>) {
        setLoading(true)
        setError(null)
        setSize(Number(event.target.value))
        setPage(0)
    }

    function handlePreviousPage() {
        setLoading(true)
        setError(null)
        setPage((currentPage) => Math.max(0, currentPage - 1))
    }

    function handleNextPage() {
        setLoading(true)
        setError(null)
        setPage((currentPage) => currentPage + 1)
    }

    const hasAuditLogs = auditLogPage.content.length > 0
    const pageTitle = useMemo(
        () =>
            hasAuditLogs
                ? 'Administrative overview'
                : 'Administration',
        [hasAuditLogs],
    )

    if (loading && !hasAuditLogs) {
        return <LoadingState message="Loading audit logs..." />
    }

    if (error) {
        return (
            <section className="page-panel admin-page">
                <div className="page-heading">
                    <p className="eyebrow">Administration</p>
                    <h1>Administrative overview</h1>
                    <p>
                        Review protected activity records from the racing
                        registry.
                    </p>
                </div>

                <div className="admin-error">
                    <ErrorState message={error} />
                    <button type="button" onClick={handleRetry} disabled={loading}>
                        Retry
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="page-panel admin-page">
            <div className="page-heading">
                <p className="eyebrow">Administration</p>
                <h1>{pageTitle}</h1>
                <p>
                    Review protected activity records from the racing registry.
                </p>
            </div>

            <section className="admin-toolbar" aria-label="Audit log controls">
                <div className="admin-toolbar-summary">
                    <h2>Audit log</h2>
                    <p>
                        Entries are ordered from newest to oldest by the
                        registry.
                    </p>
                </div>

                <label className="admin-page-size-field" htmlFor="audit-log-page-size">
                    Results per page
                    <select
                        id="audit-log-page-size"
                        value={size}
                        onChange={handleSizeChange}
                        disabled={loading}
                    >
                        {auditLogPageSizes.map((pageSize) => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="button" onClick={handleRetry} disabled={loading}>
                    Refresh audit logs
                </button>
            </section>

            {loading ? (
                <p className="admin-refresh-message" role="status">
                    Updating audit logs...
                </p>
            ) : null}

            {auditLogPage.empty ? (
                <EmptyState
                    title="No audit logs found"
                    message="Administrative activity will appear here when records are available."
                />
            ) : (
                <>
                    <div className="admin-table-panel table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date and time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Description</th>
                                    <th>Previous value</th>
                                    <th>New value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogPage.content.map((auditLog) => (
                                    <tr key={auditLog.id}>
                                        <td>{formatDateTime(auditLog.createdAt)}</td>
                                        <td>
                                            {formatAuditUser(
                                                auditLog.username,
                                                auditLog.userId,
                                            )}
                                        </td>
                                        <td>{formatAuditAction(auditLog.action)}</td>
                                        <td>
                                            {formatAuditEntity(
                                                auditLog.entityType,
                                                auditLog.entityId,
                                            )}
                                        </td>
                                        <td>
                                            {formatAuditValue(
                                                auditLog.description,
                                            )}
                                        </td>
                                        <td>
                                            {formatAuditValue(
                                                auditLog.previousValue,
                                            )}
                                        </td>
                                        <td>
                                            {formatAuditValue(
                                                auditLog.newValue,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <AuditLogPagination
                        page={auditLogPage.page}
                        totalPages={auditLogPage.totalPages}
                        totalElements={auditLogPage.totalElements}
                        first={auditLogPage.first}
                        last={auditLogPage.last}
                        loading={loading}
                        onPreviousPage={handlePreviousPage}
                        onNextPage={handleNextPage}
                    />
                </>
            )}
        </section>
    )
}