import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiError'
import { getRaces } from '../../api/racesApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { RaceFilters } from '../races/RaceFilters'
import { RacePagination } from '../races/RacePagination'
import {
    createDefaultRaceListFilters,
    type PageResponse,
    type RaceListFilters,
    type RaceResponse,
    type RaceStatus,
    type RaceType,
} from '../races/raceTypes'

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
        return 'Unable to load races for registrations. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view races for registrations.'
    }

    if (error.status === 404) {
        return 'The requested race resource was not found.'
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load races for registrations. Please try again.'
}

function createRegistrationCenterFilters(): RaceListFilters {
    return {
        ...createDefaultRaceListFilters(),
        status: 'OPEN_FOR_REGISTRATION',
    }
}

function createEmptyPage(
    filters: RaceListFilters,
): PageResponse<RaceResponse> {
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

function getRaceTypePriority(raceType: RaceType): number {
    if (raceType === 'INDIVIDUAL') {
        return 0
    }

    if (raceType === 'MIXED') {
        return 1
    }

    return 2
}

function getRegistrationActionLabel(
    race: RaceResponse,
    isAdministrator: boolean,
    username: string | undefined,
): string {
    const isOwnerOrganizer =
        username !== undefined && username === race.organizerUsername

    if (isAdministrator || isOwnerOrganizer) {
        return 'Manage registrations'
    }

    return 'View registrations'
}

export function RegistrationsLandingPage() {
    const auth = useContext(AuthContext)
    const isAdministrator = auth?.hasRole('ADMINISTRATOR') ?? false
    const username = auth?.user?.username

    const [filters, setFilters] = useState<RaceListFilters>(
        createRegistrationCenterFilters,
    )
    const [searchInput, setSearchInput] = useState('')
    const [pageResponse, setPageResponse] = useState<PageResponse<RaceResponse>>(
        () => createEmptyPage(createRegistrationCenterFilters()),
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
        setFilters(createRegistrationCenterFilters())
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

    const displayedRaces = useMemo(() => {
        if (filters.raceType !== undefined) {
            return pageResponse.content
        }

        return [...pageResponse.content].sort(
            (firstRace, secondRace) =>
                getRaceTypePriority(firstRace.raceType) -
                getRaceTypePriority(secondRace.raceType),
        )
    }, [filters.raceType, pageResponse.content])

    const hasRaceContent = displayedRaces.length > 0

    return (
        <section className="race-page registration-center-page">
            <div className="race-archive-heading race-list-heading">
                <div>
                    <p className="race-kicker">Registration center</p>
                    <h1>Registrations</h1>
                    <p>
                        Find a race, review its registration status and open its
                        registration ledger.
                    </p>
                </div>
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
                <LoadingState message="Loading races for registrations..." />
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
                                    <th>Race</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Scheduled at</th>
                                    <th>Registration deadline</th>
                                    <th>Maximum capacity</th>
                                    <th>Organizer</th>
                                    <th>Registrations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRaces.map((race) => {
                                    const actionLabel = getRegistrationActionLabel(
                                        race,
                                        isAdministrator,
                                        username,
                                    )

                                    return (
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
                                                {formatDateTime(
                                                    race.registrationDeadline,
                                                )}
                                            </td>
                                            <td>{race.maxParticipants}</td>
                                            <td>{race.organizerUsername}</td>
                                            <td>
                                                <Link
                                                    className="race-action-link registration-center-action-link"
                                                    to={`/races/${race.id}/registrations`}
                                                    aria-label={`${actionLabel} for ${race.name}`}
                                                >
                                                    {actionLabel}
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
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