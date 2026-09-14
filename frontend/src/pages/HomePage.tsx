import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/apiError'
import { getCompetitors } from '../api/competitorsApi'
import { getUpcomingRaces } from '../api/racesApi'
import { getRecentResults } from '../api/resultsApi'
import {
    getStandings,
    type StandingsResponse,
} from '../api/standingsApi'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'
import type { CompetitorResponse } from '../features/competitors/competitorTypes'
import type { RaceResponse } from '../features/races/raceTypes'
import {
    formatResultParticipant,
    getResultStatusClassName,
    getResultStatusLabel,
    type RaceResultResponse,
} from '../features/results/resultTypes'

const dashboardLimit = 5

function getDashboardErrorMessage(
    error: unknown,
    resourceName: string,
): string {
    if (!(error instanceof ApiError)) {
        return `Unable to load ${resourceName}. Please try again.`
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return `You do not have permission to view ${resourceName}.`
    }

    if (error.status === 404) {
        return `The ${resourceName} service was not found.`
    }

    if (error.status === 409) {
        return `The ${resourceName} request could not be completed. Please try again.`
    }

    if (error.status >= 500) {
        return `The ${resourceName} service is currently unavailable. Please try again.`
    }

    return error.message || `Unable to load ${resourceName}. Please try again.`
}

function createEmptyStandings(): StandingsResponse {
    return {
        competitors: [],
        teams: [],
    }
}

function formatDateTime(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function formatDurationSeconds(value: number | null): string {
    if (value === null) {
        return 'Not available'
    }

    const hours = Math.floor(value / 3600)
    const minutes = Math.floor((value % 3600) / 60)
    const seconds = value % 60

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }

    return `${seconds}s`
}

function getRaceStatusClassName(status: RaceResponse['status']): string {
    return `race-status-${status.toLowerCase().replaceAll('_', '-')}`
}

function getCompetitorStatusClassName(
    status: CompetitorResponse['status'],
): string {
    return `competitor-status-${status.toLowerCase()}`
}

function getResultTimeLabel(result: RaceResultResponse): string {
    if (result.status !== 'FINISHED') {
        return 'Not applicable'
    }

    const completionTime = formatDurationSeconds(result.completionTimeSeconds)
    const penaltyTime = formatDurationSeconds(result.penaltyTimeSeconds)

    return `Finish ${completionTime}, penalty ${penaltyTime}`
}

interface DashboardContentProps {
    onRetry: () => void
}

function DashboardContent({ onRetry }: DashboardContentProps) {
    const [standings, setStandings] = useState<StandingsResponse>(
        createEmptyStandings,
    )
    const [upcomingRaces, setUpcomingRaces] = useState<RaceResponse[]>([])
    const [activeCompetitors, setActiveCompetitors] = useState<
        CompetitorResponse[]
    >([])
    const [activeCompetitorCount, setActiveCompetitorCount] = useState(0)
    const [recentResults, setRecentResults] = useState<RaceResultResponse[]>(
        [],
    )

    const [standingsLoading, setStandingsLoading] = useState(true)
    const [upcomingRacesLoading, setUpcomingRacesLoading] = useState(true)
    const [activeCompetitorsLoading, setActiveCompetitorsLoading] =
        useState(true)
    const [recentResultsLoading, setRecentResultsLoading] = useState(true)

    const [standingsError, setStandingsError] = useState<string | null>(null)
    const [upcomingRacesError, setUpcomingRacesError] = useState<string | null>(
        null,
    )
    const [activeCompetitorsError, setActiveCompetitorsError] = useState<
        string | null
    >(null)
    const [recentResultsError, setRecentResultsError] = useState<string | null>(
        null,
    )

    useEffect(() => {
        let active = true

        void Promise.allSettled([
            getStandings(),
            getUpcomingRaces(dashboardLimit),
            getCompetitors({
                status: 'ACTIVE',
                page: 0,
                size: dashboardLimit,
                sort: 'name,asc',
            }),
            getRecentResults(dashboardLimit),
        ]).then((results) => {
            if (!active) {
                return
            }

            const [
                standingsResult,
                upcomingRacesResult,
                activeCompetitorsResult,
                recentResultsResult,
            ] = results

            if (standingsResult.status === 'fulfilled') {
                setStandings(standingsResult.value)
                setStandingsError(null)
            } else {
                setStandingsError(
                    getDashboardErrorMessage(
                        standingsResult.reason,
                        'race standings',
                    ),
                )
            }

            if (upcomingRacesResult.status === 'fulfilled') {
                setUpcomingRaces(upcomingRacesResult.value)
                setUpcomingRacesError(null)
            } else {
                setUpcomingRacesError(
                    getDashboardErrorMessage(
                        upcomingRacesResult.reason,
                        'upcoming races',
                    ),
                )
            }

            if (activeCompetitorsResult.status === 'fulfilled') {
                setActiveCompetitors(activeCompetitorsResult.value.content)
                setActiveCompetitorCount(
                    activeCompetitorsResult.value.totalElements,
                )
                setActiveCompetitorsError(null)
            } else {
                setActiveCompetitorsError(
                    getDashboardErrorMessage(
                        activeCompetitorsResult.reason,
                        'active competitors',
                    ),
                )
            }

            if (recentResultsResult.status === 'fulfilled') {
                setRecentResults(recentResultsResult.value)
                setRecentResultsError(null)
            } else {
                setRecentResultsError(
                    getDashboardErrorMessage(
                        recentResultsResult.reason,
                        'recently recorded results',
                    ),
                )
            }

            setStandingsLoading(false)
            setUpcomingRacesLoading(false)
            setActiveCompetitorsLoading(false)
            setRecentResultsLoading(false)
        })

        return () => {
            active = false
        }
    }, [])

    const hasCompetitorStandings = standings.competitors.length > 0
    const hasTeamStandings = standings.teams.length > 0

    return (
        <section className="page-panel home-page">
            <div className="page-heading">
                <p className="eyebrow">Race center</p>
                <h1>Season dashboard</h1>
                <p>
                    Review upcoming races, active competitors, recently
                    recorded results, and current season standings.
                </p>
            </div>

            <div className="home-dashboard-grid">
                <section
                    className="home-dashboard-section"
                    aria-labelledby="upcoming-races-heading"
                >
                    <div className="home-dashboard-heading">
                        <div>
                            <h2 id="upcoming-races-heading">Upcoming races</h2>
                            <p>
                                Next scheduled races that are not completed or
                                cancelled.
                            </p>
                        </div>
                        <Link className="home-dashboard-link" to="/races">
                            View races
                        </Link>
                    </div>

                    {upcomingRacesLoading ? (
                        <LoadingState message="Loading upcoming races..." />
                    ) : null}

                    {upcomingRacesError ? (
                        <div className="home-error">
                            <ErrorState message={upcomingRacesError} />
                            <button type="button" onClick={onRetry}>
                                Retry
                            </button>
                        </div>
                    ) : null}

                    {!upcomingRacesLoading &&
                        !upcomingRacesError &&
                        upcomingRaces.length === 0 ? (
                        <EmptyState
                            title="No upcoming races"
                            message="There are no future races available at this time."
                        />
                    ) : null}

                    {!upcomingRacesLoading &&
                        !upcomingRacesError &&
                        upcomingRaces.length > 0 ? (
                        <ul className="home-upcoming-race-list">
                            {upcomingRaces.map((race) => (
                                <li key={race.id}>
                                    <div>
                                        <Link
                                            className="race-detail-link"
                                            to={`/races/${race.id}`}
                                        >
                                            {race.name}
                                        </Link>
                                        <p>
                                            {formatDateTime(race.scheduledAt)}
                                        </p>
                                    </div>
                                    <div className="home-race-meta">
                                        <span>{race.raceType}</span>
                                        <span
                                            className={`race-status-badge ${getRaceStatusClassName(
                                                race.status,
                                            )}`}
                                        >
                                            {race.status.replaceAll('_', ' ')}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </section>

                <section
                    className="home-dashboard-section"
                    aria-labelledby="active-competitors-heading"
                >
                    <div className="home-dashboard-heading">
                        <div>
                            <h2 id="active-competitors-heading">
                                Active competitors
                            </h2>
                            <p>
                                Current competitors with ACTIVE status.
                            </p>
                        </div>
                        <Link className="home-dashboard-link" to="/competitors">
                            View competitors
                        </Link>
                    </div>

                    {activeCompetitorsLoading ? (
                        <LoadingState message="Loading active competitors..." />
                    ) : null}

                    {activeCompetitorsError ? (
                        <div className="home-error">
                            <ErrorState message={activeCompetitorsError} />
                            <button type="button" onClick={onRetry}>
                                Retry
                            </button>
                        </div>
                    ) : null}

                    {!activeCompetitorsLoading && !activeCompetitorsError ? (
                        <div className="home-summary-card">
                            <p className="home-summary-label">
                                Active competitor count
                            </p>
                            <p className="home-summary-value">
                                {activeCompetitorCount}
                            </p>
                            <p className="home-summary-description">
                                This total comes from the paginated competitor
                                response.
                            </p>

                            {activeCompetitorCount === 0 ? (
                                <EmptyState
                                    title="No active competitors"
                                    message="No competitor currently has ACTIVE status."
                                />
                            ) : (
                                <ul className="home-active-competitor-list">
                                    {activeCompetitors.map((competitor) => (
                                        <li key={competitor.id}>
                                            <Link
                                                className="competitor-detail-link"
                                                to={`/competitors/${competitor.id}`}
                                            >
                                                {competitor.name}
                                            </Link>
                                            <span>{competitor.nickname}</span>
                                            <span
                                                className={`competitor-status-badge ${getCompetitorStatusClassName(
                                                    competitor.status,
                                                )}`}
                                            >
                                                {competitor.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}
                </section>

                <section
                    className="home-dashboard-section home-dashboard-section-wide"
                    aria-labelledby="recent-results-heading"
                >
                    <div className="home-dashboard-heading">
                        <div>
                            <h2 id="recent-results-heading">
                                Recently recorded results
                            </h2>
                            <p>
                                Official results ordered by the most recent
                                record time.
                            </p>
                        </div>
                    </div>

                    {recentResultsLoading ? (
                        <LoadingState message="Loading recently recorded results..." />
                    ) : null}

                    {recentResultsError ? (
                        <div className="home-error">
                            <ErrorState message={recentResultsError} />
                            <button type="button" onClick={onRetry}>
                                Retry
                            </button>
                        </div>
                    ) : null}

                    {!recentResultsLoading &&
                        !recentResultsError &&
                        recentResults.length === 0 ? (
                        <EmptyState
                            title="No recently recorded results"
                            message="Official results will appear here after they are recorded."
                        />
                    ) : null}

                    {!recentResultsLoading &&
                        !recentResultsError &&
                        recentResults.length > 0 ? (
                        <div className="table-wrapper home-recent-results-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Participant</th>
                                        <th>Race</th>
                                        <th>Status</th>
                                        <th>Position</th>
                                        <th>Time</th>
                                        <th>Recorded</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentResults.map((result) => (
                                        <tr key={result.id}>
                                            <td>
                                                {result.competitorId ? (
                                                    <Link
                                                        className="competitor-detail-link"
                                                        to={`/competitors/${result.competitorId}`}
                                                    >
                                                        {formatResultParticipant(
                                                            result,
                                                        )}
                                                    </Link>
                                                ) : (
                                                    formatResultParticipant(result)
                                                )}
                                            </td>
                                            <td>
                                                <Link
                                                    className="race-detail-link"
                                                    to={`/races/${result.raceId}`}
                                                >
                                                    {result.raceName}
                                                </Link>
                                            </td>
                                            <td>
                                                <span
                                                    className={`result-status-badge ${getResultStatusClassName(
                                                        result.status,
                                                    )}`}
                                                >
                                                    {getResultStatusLabel(
                                                        result.status,
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                {result.finalPosition === null
                                                    ? 'Not applicable'
                                                    : result.finalPosition}
                                            </td>
                                            <td>{getResultTimeLabel(result)}</td>
                                            <td>
                                                {formatDateTime(result.recordedAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            </div>

            <section
                className="home-dashboard-section home-standings-section"
                aria-labelledby="standings-heading"
            >
                <div className="home-dashboard-heading">
                    <div>
                        <h2 id="standings-heading">Current standings</h2>
                        <p>
                            Official points earned by competitors and teams
                            during the season.
                        </p>
                    </div>
                </div>

                {standingsLoading ? (
                    <LoadingState message="Loading race standings..." />
                ) : null}

                {standingsError ? (
                    <div className="home-error">
                        <ErrorState message={standingsError} />
                        <button type="button" onClick={onRetry}>
                            Retry
                        </button>
                    </div>
                ) : null}

                {!standingsLoading &&
                    !standingsError &&
                    !hasCompetitorStandings &&
                    !hasTeamStandings ? (
                    <EmptyState
                        title="No standings yet"
                        message="Standings will appear here once official race results are available."
                    />
                ) : null}

                {!standingsLoading &&
                    !standingsError &&
                    (hasCompetitorStandings || hasTeamStandings) ? (
                    <div className="home-standings-grid">
                        <section className="home-standings-section">
                            <div className="home-standings-heading">
                                <h2>Competitor standings</h2>
                                <p>
                                    Points earned from official results in
                                    individual registrations.
                                </p>
                            </div>

                            {hasCompetitorStandings ? (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Competitor</th>
                                                <th>Nickname</th>
                                                <th>Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.competitors.map(
                                                (standing, index) => (
                                                    <tr
                                                        key={
                                                            standing.competitorId
                                                        }
                                                    >
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <Link
                                                                className="competitor-detail-link"
                                                                to={`/competitors/${standing.competitorId}`}
                                                            >
                                                                {standing.name}
                                                            </Link>
                                                        </td>
                                                        <td>
                                                            {standing.nickname}
                                                        </td>
                                                        <td>
                                                            {standing.points}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No competitor standings"
                                    message="No individual competitor has official results yet."
                                />
                            )}
                        </section>

                        <section className="home-standings-section">
                            <div className="home-standings-heading">
                                <h2>Team standings</h2>
                                <p>
                                    Points earned from official results in team
                                    registrations.
                                </p>
                            </div>

                            {hasTeamStandings ? (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Team</th>
                                                <th>Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.teams.map(
                                                (standing, index) => (
                                                    <tr key={standing.teamId}>
                                                        <td>{index + 1}</td>
                                                        <td>{standing.name}</td>
                                                        <td>
                                                            {standing.points}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No team standings"
                                    message="No team has official results yet."
                                />
                            )}
                        </section>
                    </div>
                ) : null}
            </section>
        </section>
    )
}

export function HomePage() {
    const [requestVersion, setRequestVersion] = useState(0)

    function handleRetry() {
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    return <DashboardContent key={requestVersion} onRetry={handleRetry} />
}