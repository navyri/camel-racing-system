import {
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react'
import { Link } from 'react-router-dom'

import { getTeams } from '../../api/teamsApi'
import { ApiError } from '../../api/apiError'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { TeamFilters } from './TeamFilters'
import { TeamPagination } from './TeamPagination'
import {
    defaultTeamFilters,
    getTeamRecordLabel,
    getTeamStatusClassName,
    getTeamStatusLabel,
    type TeamFiltersState,
    type TeamPageResponse,
} from './teamTypes'

const emptyTeamPage: TeamPageResponse = {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
}

function getTeamsErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 403) {
            return 'You do not have permission to view teams.'
        }

        return error.message
    }

    return 'Teams could not be loaded. Please try again.'
}

export function TeamListPage() {
    const auth = useContext(AuthContext)
    const [filters, setFilters] = useState<TeamFiltersState>(
        defaultTeamFilters,
    )
    const [teamsPage, setTeamsPage] =
        useState<TeamPageResponse>(emptyTeamPage)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [requestKey, setRequestKey] = useState(0)

    const canCreateTeam =
        auth?.hasRole('ADMINISTRATOR') ?? false

    const loadTeams = useCallback(async () => {
        try {
            const response = await getTeams({
                status: filters.status || undefined,
                search: filters.search,
                page: filters.page,
                size: filters.size,
                sort: filters.sort,
            })

            setTeamsPage(response)
            setErrorMessage(null)
        } catch (error) {
            setErrorMessage(getTeamsErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [filters])

    useEffect(() => {
        void Promise.resolve().then(loadTeams)
    }, [loadTeams, requestKey])

    function handleFiltersChange(nextFilters: TeamFiltersState) {
        setIsLoading(true)
        setFilters(nextFilters)
    }

    function handleRefresh() {
        setIsLoading(true)
        setRequestKey((currentValue) => currentValue + 1)
    }

    function handlePageChange(page: number) {
        setIsLoading(true)
        setFilters((currentFilters) => ({
            ...currentFilters,
            page,
        }))
    }

    if (isLoading && teamsPage.content.length === 0) {
        return <LoadingState message="Loading team registry..." />
    }

    if (errorMessage && teamsPage.content.length === 0) {
        return (
            <section className="team-page">
                <header className="team-detail-header">
                    <div>
                        <p className="team-kicker">Team registry</p>
                        <h1>Team registry unavailable</h1>
                        <p>{errorMessage}</p>
                    </div>
                </header>

                <ErrorState message={errorMessage} />

                <div className="team-detail-actions">
                    <button
                        type="button"
                        onClick={handleRefresh}
                    >
                        Retry
                    </button>

                    <Link
                        className="team-action-link team-action-link-secondary"
                        to="/"
                    >
                        Return home
                    </Link>
                </div>
            </section>
        )
    }

    return (
        <section className="team-page">
            <header className="team-list-heading">
                <div>
                    <p className="team-kicker">Team registry</p>
                    <h1>Teams</h1>
                    <p>
                        Review racing teams, their coaches, records, and
                        active status.
                    </p>
                </div>

                {canCreateTeam ? (
                    <Link
                        className="team-action-link"
                        to="/teams/new"
                    >
                        Create team
                    </Link>
                ) : null}
            </header>

            {errorMessage ? (
                <section
                    className="team-refresh-message notice-error"
                    role="alert"
                >
                    <p>{errorMessage}</p>
                    <button
                        type="button"
                        onClick={handleRefresh}
                    >
                        Retry
                    </button>
                </section>
            ) : null}

            <TeamFilters
                filters={filters}
                disabled={isLoading}
                onChange={handleFiltersChange}
                onRefresh={handleRefresh}
            />

            {teamsPage.content.length === 0 ? (
                <EmptyState
                    title="No teams found"
                    message="Try changing the search or status filters."
                />
            ) : (
                <>
                    <section
                        className="team-table-panel"
                        aria-label="Team list"
                    >
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Team</th>
                                        <th scope="col">Coach</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Record</th>
                                        <th scope="col">Created</th>
                                        <th scope="col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamsPage.content.map((team) => (
                                        <tr key={team.id}>
                                            <td>
                                                <strong>{team.name}</strong>
                                                <br />
                                                <span className="team-description">
                                                    {team.description}
                                                </span>
                                            </td>
                                            <td>{team.coachName}</td>
                                            <td>
                                                <span
                                                    className={`team-status-badge ${getTeamStatusClassName(
                                                        team.status,
                                                    )}`}
                                                >
                                                    {getTeamStatusLabel(
                                                        team.status,
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                {getTeamRecordLabel(
                                                    team.victories,
                                                    team.defeats,
                                                )}
                                            </td>
                                            <td>
                                                {formatDateTime(
                                                    team.createdAt,
                                                )}
                                            </td>
                                            <td>
                                                <Link
                                                    className="team-detail-link"
                                                    to={`/teams/${team.id}`}
                                                >
                                                    View team
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <TeamPagination
                        page={teamsPage.page}
                        totalPages={teamsPage.totalPages}
                        totalElements={teamsPage.totalElements}
                        pageSize={teamsPage.size}
                        disabled={isLoading}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </section>
    )
}