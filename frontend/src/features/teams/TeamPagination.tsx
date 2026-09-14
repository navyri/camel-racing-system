interface TeamPaginationProps {
    page: number
    totalPages: number
    totalElements: number
    pageSize: number
    disabled: boolean
    onPageChange: (page: number) => void
}

export function TeamPagination({
    page,
    totalPages,
    totalElements,
    pageSize,
    disabled,
    onPageChange,
}: TeamPaginationProps) {
    const currentPage = totalPages === 0 ? 0 : page
    const displayPage = totalPages === 0 ? 0 : currentPage + 1
    const canGoPrevious = currentPage > 0
    const canGoNext =
        totalPages > 0 && currentPage < totalPages - 1

    const visibleFrom =
        totalElements === 0 ? 0 : currentPage * pageSize + 1
    const visibleTo = Math.min(
        (currentPage + 1) * pageSize,
        totalElements,
    )

    return (
        <nav
            className="team-pagination"
            aria-label="Team pagination"
        >
            <span>
                Page {displayPage} of {totalPages}
            </span>

            <span>
                Showing {visibleFrom}-{visibleTo} of {totalElements} teams
            </span>

            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={disabled || !canGoPrevious}
            >
                Previous
            </button>

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={disabled || !canGoNext}
            >
                Next
            </button>
        </nav>
    )
}