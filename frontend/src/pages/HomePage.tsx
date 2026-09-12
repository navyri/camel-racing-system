import { useEffect, useState } from 'react'
import { ApiError } from '../api/apiError'
import { getStandings, type Standing } from '../api/standingsApi'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'

export function HomePage() {
    const [standings, setStandings] = useState<Standing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        void getStandings()
            .then((data) => {
                if (active) {
                    setStandings(data)
                }
            })
            .catch((reason: unknown) => {
                if (!active) {
                    return
                }

                if (reason instanceof ApiError) {
                    setError(reason.message)
                    return
                }

                setError('Unable to load race standings.')
            })
            .finally(() => {
                if (active) {
                    setLoading(false)
                }
            })

        return () => {
            active = false
        }
    }, [])

    if (loading) {
        return <LoadingState message="Loading race standings..." />
    }

    if (error) {
        return <ErrorState message={error} />
    }

    if (standings.length === 0) {
        return (
            <EmptyState
                title="No standings yet"
                message="Race standings will appear here once results are available."
            />
        )
    }

    return (
        <section>
            <div className="page-heading">
                <p className="eyebrow">Race center</p>
                <h1>Current standings</h1>
                <p>Track the performance of every camel across the season.</p>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Camel</th>
                            <th>Races</th>
                            <th>Wins</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((standing) => (
                            <tr key={standing.camelId}>
                                <td>{standing.camelName}</td>
                                <td>{standing.races}</td>
                                <td>{standing.wins}</td>
                                <td>{standing.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}