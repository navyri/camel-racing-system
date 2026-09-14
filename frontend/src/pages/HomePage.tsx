import { useEffect, useState } from 'react'
import { ApiError } from '../api/apiError'
import {
    getStandings,
    type StandingsResponse,
} from '../api/standingsApi'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'

function getHomeErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load race standings. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view race standings.'
    }

    if (error.status === 404) {
        return 'The standings service was not found.'
    }

    if (error.status >= 500) {
        return 'The standings service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load race standings. Please try again.'
}

function createEmptyStandings(): StandingsResponse {
    return {
        competitors: [],
        teams: [],
    }
}

export function HomePage() {
    const [standings, setStandings] = useState<StandingsResponse>(
        createEmptyStandings,
    )
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        let active = true

        void getStandings()
            .then((response) => {
                if (active) {
                    setStandings(response)
                    setError(null)
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setError(getHomeErrorMessage(reason))
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
    }, [requestVersion])

    function handleRetry() {
        setLoading(true)
        setError(null)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    const hasCompetitorStandings = standings.competitors.length > 0
    const hasTeamStandings = standings.teams.length > 0
    const hasStandings = hasCompetitorStandings || hasTeamStandings

    if (loading && !hasStandings) {
        return <LoadingState message="Loading race standings..." />
    }

    if (error) {
        return (
            <section className="page-panel home-page">
                <div className="page-heading">
                    <p className="eyebrow">Desert dispatch</p>
                    <h1>Season record unavailable</h1>
                    <p>
                        The standings ledger could not be opened. Try again or
                        confirm that your session is active.
                    </p>
                </div>

                <div className="home-error">
                    <ErrorState message={error} />
                    <button type="button" onClick={handleRetry} disabled={loading}>
                        Retry
                    </button>
                </div>
            </section>
        )
    }

    if (!hasStandings) {
        return (
            <section className="page-panel home-page">
                <div className="page-heading">
                    <p className="eyebrow">Race center</p>
                    <h1>Current standings</h1>
                    <p>
                        Track official competitor and team performance across the
                        season.
                    </p>
                </div>

                <EmptyState
                    title="No standings yet"
                    message="Standings will appear here once official race results are available."
                />
            </section>
        )
    }

    return (
        <section className="page-panel home-page">
            <div className="page-heading">
                <p className="eyebrow">Race center</p>
                <h1>Current standings</h1>
                <p>
                    Track official competitor and team performance across the
                    season.
                </p>
            </div>

            {loading ? (
                <p className="home-refresh-message" role="status">
                    Updating standings...
                </p>
            ) : null}

            <div className="home-standings-grid">
                <section className="home-standings-section">
                    <div className="home-standings-heading">
                        <h2>Competitor standings</h2>
                        <p>
                            Points earned from official results in individual
                            registrations.
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
                                            <tr key={standing.competitorId}>
                                                <td>{index + 1}</td>
                                                <td>{standing.name}</td>
                                                <td>{standing.nickname}</td>
                                                <td>{standing.points}</td>
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
                                    {standings.teams.map((standing, index) => (
                                        <tr key={standing.teamId}>
                                            <td>{index + 1}</td>
                                            <td>{standing.name}</td>
                                            <td>{standing.points}</td>
                                        </tr>
                                    ))}
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
        </section>
    )
}