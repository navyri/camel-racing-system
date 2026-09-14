import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiError'
import { getCompetitors } from '../../api/competitorsApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDate } from '../../utils/dateFormat'
import { CompetitorFilters } from './CompetitorFilters'
import { CompetitorPagination } from './CompetitorPagination'
import {
    createDefaultCompetitorListFilters,
    type CompetitorListFilters,
    type CompetitorResponse,
    type CompetitorStatus,
    type CompetitorType,
    type PageResponse,
} from './competitorTypes'

function formatEnum(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatRecord(competitor: CompetitorResponse): string {
    return `${competitor.victories} wins, ${competitor.defeats} defeats, ${competitor.completedRaces} completed`
}

function formatAgeReference(competitor: CompetitorResponse): string {
    if (competitor.dateOfBirth) {
        return `Born ${formatDate(competitor.dateOfBirth)}`
    }

    if (competitor.approximateAge !== null) {
        return `Approx. ${competitor.approximateAge} years`
    }

    return 'Not available'
}

function toStatusClassName(status: CompetitorStatus): string {
    return `competitor-status-${status.toLowerCase()}`
}

function getErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load competitors. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view competitors.'
    }

    if (error.status >= 500) {
        return 'The competitor service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load competitors. Please try again.'
}

function createEmptyPage(
    filters: CompetitorListFilters,
): PageResponse<CompetitorResponse> {
    return {
        content: [],
        page: filters.page,
        size: filters.size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        empty: true,
    }
}

export function CompetitorListPage() {
    const auth = useContext(AuthContext)
    const canManageCompetitors = auth?.hasRole('ADMINISTRATOR') ?? false

    const [filters, setFilters] = useState<CompetitorListFilters>(
        createDefaultCompetitorListFilters,
    )
    const [searchInput, setSearchInput] = useState('')
    const [originInput, setOriginInput] = useState('')
    const [pageResponse, setPageResponse] = useState<
        PageResponse<CompetitorResponse>
    >(() => createEmptyPage(createDefaultCompetitorListFilters()))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        let active = true

        void getCompetitors(filters)
            .then((response) => {
                if (active) {
                    setPageResponse(response)
                    setError(null)
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setError(getErrorMessage(reason))
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
    }, [filters, requestVersion])

    function updateFilters(
        updater: (
            currentFilters: CompetitorListFilters,
        ) => CompetitorListFilters,
    ) {
        setLoading(true)
        setError(null)
        setFilters((currentFilters) => updater(currentFilters))
    }

    function handleTypeChange(type: CompetitorType | undefined) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            type,
            page: 0,
        }))
    }

    function handleStatusChange(status: CompetitorStatus | undefined) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            status,
            page: 0,
        }))
    }

    function handleFilterSubmit() {
        const search = searchInput.trim()
        const origin = originInput.trim()

        updateFilters((currentFilters) => ({
            ...currentFilters,
            search: search.length > 0 ? search : undefined,
            origin: origin.length > 0 ? origin : undefined,
            page: 0,
        }))
    }

    function handleSizeChange(size: number) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            size,
            page: 0,
        }))
    }

    function handleSortChange(sort: string) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            sort,
            page: 0,
        }))
    }

    function handleClearFilters() {
        setLoading(true)
        setError(null)
        setSearchInput('')
        setOriginInput('')
        setFilters(createDefaultCompetitorListFilters())
    }

    function handlePreviousPage() {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            page: Math.max(0, currentFilters.page - 1),
        }))
    }

    function handleNextPage() {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            page: currentFilters.page + 1,
        }))
    }

    function handleRetry() {
        setLoading(true)
        setError(null)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    const hasCompetitorContent = pageResponse.content.length > 0

    return (
        <section className="competitor-page">
            <div className="competitor-archive-heading competitor-list-heading">
                <div>
                    <p className="competitor-kicker">Competitor registry</p>
                    <h1>Competitors</h1>
                    <p>
                        Browse active and historical race competitors, their status,
                        and their performance record.
                    </p>
                </div>

                {canManageCompetitors ? (
                    <Link className="competitor-action-link" to="/competitors/new">
                        Create competitor
                    </Link>
                ) : null}
            </div>

            <CompetitorFilters
                filters={filters}
                searchInput={searchInput}
                originInput={originInput}
                loading={loading}
                onTypeChange={handleTypeChange}
                onStatusChange={handleStatusChange}
                onSearchInputChange={setSearchInput}
                onOriginInputChange={setOriginInput}
                onFilterSubmit={handleFilterSubmit}
                onSizeChange={handleSizeChange}
                onSortChange={handleSortChange}
                onClearFilters={handleClearFilters}
            />

            {loading && !hasCompetitorContent ? (
                <LoadingState message="Loading competitors..." />
            ) : null}

            {error ? (
                <div className="competitor-error">
                    <ErrorState message={error} />
                    <button type="button" onClick={handleRetry} disabled={loading}>
                        Retry
                    </button>
                </div>
            ) : null}

            {!loading && !error && pageResponse.empty ? (
                <EmptyState
                    title="No competitors found"
                    message="Try changing the filters or search criteria."
                />
            ) : null}

            {!error && hasCompetitorContent ? (
                <>
                    {loading ? (
                        <p className="competitor-refresh-message" role="status">
                            Updating competitors...
                        </p>
                    ) : null}

                    <div className="competitor-table-panel table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Nickname</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Origin</th>
                                    <th>Age reference</th>
                                    <th>Record</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageResponse.content.map((competitor) => (
                                    <tr key={competitor.id}>
                                        <td>
                                            <Link
                                                className="competitor-detail-link"
                                                to={`/competitors/${competitor.id}`}
                                            >
                                                {competitor.name}
                                            </Link>
                                        </td>
                                        <td>{competitor.nickname}</td>
                                        <td>
                                            {formatEnum(competitor.competitorType)}
                                        </td>
                                        <td>
                                            <span
                                                className={[
                                                    'competitor-status-badge',
                                                    toStatusClassName(
                                                        competitor.status,
                                                    ),
                                                ].join(' ')}
                                            >
                                                {formatEnum(competitor.status)}
                                            </span>
                                        </td>
                                        <td>{competitor.origin}</td>
                                        <td>{formatAgeReference(competitor)}</td>
                                        <td>{formatRecord(competitor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <CompetitorPagination
                        page={pageResponse.page}
                        totalPages={pageResponse.totalPages}
                        totalElements={pageResponse.totalElements}
                        first={pageResponse.first}
                        last={pageResponse.last}
                        loading={loading}
                        onPreviousPage={handlePreviousPage}
                        onNextPage={handleNextPage}
                    />
                </>
            ) : null}
        </section>
    )
}