interface CompetitorPaginationProps {
    page: number
    totalPages: number
    totalElements: number
    first: boolean
    last: boolean
    loading: boolean
    onPreviousPage: () => void
    onNextPage: () => void
}

export function CompetitorPagination({
    page,
    totalPages,
    totalElements,
    first,
    last,
    loading,
    onPreviousPage,
    onNextPage,
}: CompetitorPaginationProps) {
    if (totalElements === 0) {
        return null
    }

    return (
        <nav
            className="competitor-pagination pagination-actions"
            aria-label="Competitor pagination"
        >
            <button
                type="button"
                onClick={onPreviousPage}
                disabled={loading || first}
            >
                Previous
            </button>
            <span className="pagination-summary">
                Page {page + 1} of {totalPages}
            </span>
            <span>{totalElements} total competitors</span>
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