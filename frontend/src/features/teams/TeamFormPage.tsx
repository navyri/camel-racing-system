import {
    useContext,
    useEffect,
    useState,
} from 'react'
import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    createTeam,
    getTeamById,
    updateTeam,
} from '../../api/teamsApi'
import {
    ApiError,
    getApiValidationErrors,
} from '../../api/apiError'
import { AuthContext } from '../../auth/AuthContext'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { TeamForm } from './TeamForm'
import {
    createEmptyTeamFormValues,
    toTeamFormValues,
    toTeamRequest,
    type TeamFormErrors,
    type TeamFormValues,
    type TeamResponse,
} from './teamTypes'

function getTeamFormErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 403) {
            return 'You do not have permission to save this team.'
        }

        if (error.status === 409) {
            return 'A team with this name already exists.'
        }

        return error.message
    }

    return 'Team could not be saved. Please try again.'
}

export function TeamFormPage() {
    const auth = useContext(AuthContext)
    const navigate = useNavigate()
    const { teamId } = useParams()

    const isEditing = Boolean(teamId)
    const canManageTeams =
        auth?.hasRole('ADMINISTRATOR') ?? false

    const [team, setTeam] = useState<TeamResponse | null>(null)
    const [isLoading, setIsLoading] = useState(isEditing)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [backendErrors, setBackendErrors] =
        useState<TeamFormErrors>({})
    const [reloadIndex, setReloadIndex] = useState(0)

    useEffect(() => {
        if (!isEditing || !teamId) {
            return
        }

        let isMounted = true
        const currentTeamId = teamId

        async function loadTeam() {
            try {
                const response = await getTeamById(currentTeamId)

                if (isMounted) {
                    setTeam(response)
                    setLoadError(null)
                }
            } catch (error) {
                if (!isMounted) {
                    return
                }

                if (error instanceof ApiError && error.status === 404) {
                    setLoadError('Team was not found.')
                } else if (
                    error instanceof ApiError &&
                    error.status === 403
                ) {
                    setLoadError(
                        'You do not have permission to view this team.',
                    )
                } else {
                    setLoadError(
                        'Team details could not be loaded. Please try again.',
                    )
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void Promise.resolve().then(loadTeam)

        return () => {
            isMounted = false
        }
    }, [isEditing, reloadIndex, teamId])

    useEffect(() => {
        if (!canManageTeams) {
            navigate('/forbidden', {
                replace: true,
            })
        }
    }, [canManageTeams, navigate])

    async function handleSubmit(values: TeamFormValues) {
        setIsSubmitting(true)
        setSubmitError(null)
        setBackendErrors({})

        try {
            const request = toTeamRequest(values)

            const savedTeam = isEditing && teamId
                ? await updateTeam(teamId, request)
                : await createTeam(request)

            navigate(`/teams/${savedTeam.id}`, {
                replace: true,
            })
        } catch (error) {
            const validationErrors = getApiValidationErrors(error)

            if (validationErrors) {
                setBackendErrors({
                    name: validationErrors.name,
                    description: validationErrors.description,
                    coachName: validationErrors.coachName,
                })
            }

            setSubmitError(getTeamFormErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleCancel() {
        if (isEditing && teamId) {
            navigate(`/teams/${teamId}`)
            return
        }

        navigate('/teams')
    }

    function handleRetryLoad() {
        setIsLoading(true)
        setLoadError(null)
        setReloadIndex((currentValue) => currentValue + 1)
    }

    if (!canManageTeams) {
        return null
    }

    if (isLoading) {
        return <LoadingState message="Loading team record..." />
    }

    if (loadError) {
        return (
            <section className="team-page">
                <header className="team-detail-header">
                    <div>
                        <p className="team-kicker">Team registry</p>
                        <h1>Team record unavailable</h1>
                        <p>{loadError}</p>
                    </div>
                </header>

                <ErrorState message={loadError} />

                <div className="team-detail-actions">
                    <button
                        type="button"
                        onClick={handleRetryLoad}
                    >
                        Retry
                    </button>

                    <Link
                        className="team-action-link team-action-link-secondary"
                        to="/teams"
                    >
                        Return to teams
                    </Link>
                </div>
            </section>
        )
    }

    if (isEditing && !team) {
        return (
            <section className="team-page">
                <header className="team-detail-header">
                    <div>
                        <p className="team-kicker">Team registry</p>
                        <h1>Team not found</h1>
                        <p>
                            The requested team record is unavailable.
                        </p>
                    </div>
                </header>

                <Link
                    className="team-action-link"
                    to="/teams"
                >
                    Return to teams
                </Link>
            </section>
        )
    }

    const initialValues = team
        ? toTeamFormValues(team)
        : createEmptyTeamFormValues()

    return (
        <section className="team-page">
            <header className="team-detail-header">
                <div>
                    <p className="team-kicker">Team registry</p>
                    <h1>
                        {isEditing ? 'Edit team' : 'Create team'}
                    </h1>
                    <p>
                        {isEditing
                            ? 'Update the team profile, coach, and description.'
                            : 'Register a new racing team before adding active competitors.'}
                    </p>
                </div>
            </header>

            <TeamForm
                key={team?.id ?? 'new-team'}
                initialValues={initialValues}
                submitLabel={
                    isEditing ? 'Save team changes' : 'Create team'
                }
                isSubmitting={isSubmitting}
                submitError={submitError}
                backendErrors={backendErrors}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />
        </section>
    )
}