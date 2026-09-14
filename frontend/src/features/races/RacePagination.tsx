interface RacePaginationProps {
    page: number
    totalPages: number
    totalElements: number
    first: boolean
    last: boolean
    loading: boolean
    onPreviousPage: () => void
    onNextPage: () => void
}

export function RacePagination({
    page,
    totalPages,
    totalElements,
    first,
    last,
    loading,
    onPreviousPage,
    onNextPage,
}: RacePaginationProps) {
    if (totalElements === 0) {
        return null
    }

    return (
        <nav className="race-pagination pagination-actions" aria-label="Race pagination">
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
            <span>{totalElements} total races</span>
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