import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiError'
import { getRaces } from '../../api/racesApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { RaceFilters } from './RaceFilters'
import { RacePagination } from './RacePagination'
import {
    createDefaultRaceListFilters,
    type PageResponse,
    type RaceListFilters,
    type RaceResponse,
    type RaceStatus,
    type RaceType,
} from './raceTypes'

function formatEnum(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function toStatusClassName(status: RaceResponse['status']): string {
    return `race-status-${status.toLowerCase().replaceAll('_', '-')}`
}

function getErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load races. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view races.'
    }

    if (error.status === 404) {
        return 'The requested race resource was not found.'
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load races. Please try again.'
}

function createEmptyPage(filters: RaceListFilters): PageResponse<RaceResponse> {
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

export function RaceListPage() {
    const auth = useContext(AuthContext)
    const canManageRaces =
        auth?.hasRole('ADMINISTRATOR') ||
        auth?.hasRole('RACE_ORGANIZER') ||
        false

    const [filters, setFilters] = useState<RaceListFilters>(
        createDefaultRaceListFilters,
    )
    const [searchInput, setSearchInput] = useState('')
    const [pageResponse, setPageResponse] = useState<PageResponse<RaceResponse>>(
        () => createEmptyPage(createDefaultRaceListFilters()),
    )
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        let active = true

        void getRaces(filters)
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
        updater: (currentFilters: RaceListFilters) => RaceListFilters,
    ) {
        setLoading(true)
        setError(null)
        setFilters((currentFilters) => updater(currentFilters))
    }

    function handleStatusChange(status: RaceStatus | undefined) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            status,
            page: 0,
        }))
    }

    function handleRaceTypeChange(raceType: RaceType | undefined) {
        updateFilters((currentFilters) => ({
            ...currentFilters,
            raceType,
            page: 0,
        }))
    }

    function handleSearchSubmit() {
        const search = searchInput.trim()

        updateFilters((currentFilters) => ({
            ...currentFilters,
            search: search.length > 0 ? search : undefined,
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
        setFilters(createDefaultRaceListFilters())
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

    const hasRaceContent = pageResponse.content.length > 0

    return (
        <section className="race-page">
            <div className="race-archive-heading race-list-heading">
                <div>
                    <p className="race-kicker">Race center</p>
                    <h1>Races</h1>
                    <p>
                        Browse scheduled camel racing events and their registration
                        status.
                    </p>
                </div>

                {canManageRaces ? (
                    <Link className="race-action-link" to="/races/new">
                        Create race
                    </Link>
                ) : null}
            </div>

            <RaceFilters
                filters={filters}
                searchInput={searchInput}
                loading={loading}
                onStatusChange={handleStatusChange}
                onRaceTypeChange={handleRaceTypeChange}
                onSearchInputChange={setSearchInput}
                onSearchSubmit={handleSearchSubmit}
                onSizeChange={handleSizeChange}
                onSortChange={handleSortChange}
                onClearFilters={handleClearFilters}
            />

            {loading && !hasRaceContent ? (
                <LoadingState message="Loading races..." />
            ) : null}

            {error ? (
                <div className="race-error">
                    <ErrorState message={error} />
                    <button type="button" onClick={handleRetry} disabled={loading}>
                        Retry
                    </button>
                </div>
            ) : null}

            {!loading && !error && pageResponse.empty ? (
                <EmptyState
                    title="No races found"
                    message="Try changing the filters or search criteria."
                />
            ) : null}

            {!error && hasRaceContent ? (
                <>
                    {loading ? (
                        <p className="race-refresh-message" role="status">
                            Updating races...
                        </p>
                    ) : null}

                    <div className="race-table-panel table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Scheduled at</th>
                                    <th>Registration deadline</th>
                                    <th>Route</th>
                                    <th>Participants</th>
                                    <th>Organizer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageResponse.content.map((race) => (
                                    <tr key={race.id}>
                                        <td>
                                            <Link
                                                className="race-detail-link"
                                                to={`/races/${race.id}`}
                                            >
                                                {race.name}
                                            </Link>
                                        </td>
                                        <td>{formatEnum(race.raceType)}</td>
                                        <td>
                                            <span
                                                className={[
                                                    'race-status-badge',
                                                    toStatusClassName(race.status),
                                                ].join(' ')}
                                            >
                                                {formatEnum(race.status)}
                                            </span>
                                        </td>
                                        <td>{formatDateTime(race.scheduledAt)}</td>
                                        <td>
                                            {formatDateTime(race.registrationDeadline)}
                                        </td>
                                        <td className="race-route">
                                            {race.startLocation} to {race.finishLocation}
                                        </td>
                                        <td>{race.maxParticipants}</td>
                                        <td>{race.organizerUsername}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <RacePagination
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