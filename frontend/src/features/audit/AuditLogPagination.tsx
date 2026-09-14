interface AuditLogPaginationProps {
    page: number
    totalPages: number
    totalElements: number
    first: boolean
    last: boolean
    loading: boolean
    onPreviousPage: () => void
    onNextPage: () => void
}

export function AuditLogPagination({
    page,
    totalPages,
    totalElements,
    first,
    last,
    loading,
    onPreviousPage,
    onNextPage,
}: AuditLogPaginationProps) {
    const displayedTotalPages = Math.max(totalPages, 1)

    return (
        <nav
            className="audit-log-pagination"
            aria-label="Audit log pagination"
        >
            <button
                type="button"
                onClick={onPreviousPage}
                disabled={loading || first}
            >
                Previous
            </button>

            <span>
                Page {page + 1} of {displayedTotalPages}
            </span>

            <span>
                {totalElements} {totalElements === 1 ? 'audit log' : 'audit logs'}
            </span>

            <button
                type="button"
                onClick={onNextPage}
                disabled={loading || last}
            >
                Next
            </button>
        </nav>
    )
}