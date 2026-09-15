import { useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/apiError'
import {
    cancelRace,
    getRaceById,
    updateRaceStatus,
} from '../../api/racesApi'
import { AuthContext } from '../../auth/AuthContext'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { RaceStatusDialog } from './RaceStatusDialog'
import {
    canCancelRace,
    getAvailableRaceStatusTransitions,
    isRaceLockedForUpdate,
    type RaceResponse,
    type RaceStatus,
    type RaceStatusTransition,
} from './raceTypes'

interface DetailLocationState {
    successMessage?: string
}

interface PendingRaceAction {
    type: 'status' | 'cancel'
    targetStatus?: RaceStatus
    title: string
    description: string
    confirmLabel: string
}

function formatEnum(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function toStatusClassName(status: RaceStatus): string {
    return `race-status-${status.toLowerCase().replaceAll('_', '-')}`
}

function formatDistance(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2,
    }).format(value)
}

function getDetailErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load this race. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view this race.'
    }

    if (error.status === 404) {
        return 'The requested race was not found.'
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load this race. Please try again.'
}

function getActionErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to update this race. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage this race.'
    }

    if (error.status === 404) {
        return 'The race was not found before the action could be completed.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to update this race. Please try again.'
}

export function RaceDetailPage() {
    const auth = useContext(AuthContext)
    const location = useLocation()
    const navigate = useNavigate()
    const { raceId } = useParams()
    const actionTriggerRef = useRef<HTMLButtonElement | null>(null)

    const [race, setRace] = useState<RaceResponse | null>(null)
    const [loading, setLoading] = useState(raceId !== undefined)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)
    const [dismissedLocationMessage, setDismissedLocationMessage] = useState(false)
    const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(
        null,
    )
    const [pendingAction, setPendingAction] = useState<PendingRaceAction | null>(
        null,
    )
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionSubmitting, setActionSubmitting] = useState(false)

    const locationSuccessMessage =
        (location.state as DetailLocationState | null)?.successMessage ?? null
    const successMessage =
        actionSuccessMessage ??
        (dismissedLocationMessage ? null : locationSuccessMessage)

    useEffect(() => {
        if (!raceId) {
            return
        }

        let active = true

        void getRaceById(raceId)
            .then((response) => {
                if (active) {
                    setRace(response)
                    setError(null)
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setRace(null)
                    setError(getDetailErrorMessage(reason))
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
    }, [raceId, requestVersion])

    function handleRetry() {
        setLoading(true)
        setError(null)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    function handleDismissSuccessMessage() {
        setActionSuccessMessage(null)
        setDismissedLocationMessage(true)

        if (locationSuccessMessage) {
            navigate(location.pathname, {
                replace: true,
                state: null,
            })
        }
    }

    function openStatusDialog(transition: RaceStatusTransition) {
        actionTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null

        setActionError(null)
        setPendingAction({
            type: 'status',
            targetStatus: transition.nextStatus,
            title: transition.actionLabel,
            description: transition.description,
            confirmLabel: transition.actionLabel,
        })
    }

    function openCancelDialog() {
        if (!race) {
            return
        }

        actionTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null

        setActionError(null)
        setPendingAction({
            type: 'cancel',
            title: 'Cancel race',
            description:
                'Cancelling this race is destructive. Registration and race progress will not continue after cancellation.',
            confirmLabel: 'Cancel race',
        })
    }

    function returnFocusToActionTrigger() {
        window.setTimeout(() => {
            actionTriggerRef.current?.focus()
        }, 0)
    }

    function closeActionDialog() {
        if (actionSubmitting) {
            return
        }

        setPendingAction(null)
        setActionError(null)
        returnFocusToActionTrigger()
    }

    async function confirmAction() {
        if (!race || !pendingAction || actionSubmitting) {
            return
        }

        setActionSubmitting(true)
        setActionError(null)

        try {
            if (pendingAction.type === 'cancel') {
                await cancelRace(race.id)
                setRace({
                    ...race,
                    status: 'CANCELLED',
                })
                setActionSuccessMessage('Race was cancelled successfully.')
            } else if (pendingAction.targetStatus) {
                const updatedRace = await updateRaceStatus(race.id, {
                    status: pendingAction.targetStatus,
                })

                setRace(updatedRace)
                setActionSuccessMessage(
                    `Race status changed to ${formatEnum(updatedRace.status)}.`,
                )
            }

            setPendingAction(null)
            returnFocusToActionTrigger()
        } catch (reason) {
            setActionError(getActionErrorMessage(reason))
        } finally {
            setActionSubmitting(false)
        }
    }

    if (!raceId) {
        return (
            <section className="race-page">
                <div className="race-error">
                    <ErrorState message="The requested race was not found." />
                    <Link className="race-action-link" to="/races">
                        Return to races
                    </Link>
                </div>
            </section>
        )
    }

    if (loading) {
        return <LoadingState message="Loading race detail..." />
    }

    if (error) {
        const isNotFound = error === 'The requested race was not found.'

        return (
            <section className="race-page">
                <div className="race-error">
                    <ErrorState message={error} />
                    {isNotFound ? (
                        <Link className="race-action-link" to="/races">
                            Return to races
                        </Link>
                    ) : (
                        <button type="button" onClick={handleRetry}>
                            Retry
                        </button>
                    )}
                </div>
            </section>
        )
    }

    if (!race) {
        return null
    }

    const isAdministrator = auth?.hasRole('ADMINISTRATOR') ?? false
    const isOwnerOrganizer =
        auth?.hasRole('RACE_ORGANIZER') === true &&
        auth.user?.username === race.organizerUsername
    const canManageRace = isAdministrator || isOwnerOrganizer
    const transitions = getAvailableRaceStatusTransitions(race.status)
    const isLockedForUpdate = isRaceLockedForUpdate(race.status)
    const canEdit = canManageRace && !isLockedForUpdate
    const canOpenStatusAction = canManageRace && transitions.length > 0
    const canOpenCancelAction = canManageRace && canCancelRace(race.status)

    return (
        <section className="race-page">
            <div className="race-detail-header">
                <div>
                    <p className="race-kicker">Race record</p>
                    <h1>{race.name}</h1>
                    <p>{race.description}</p>
                </div>

                <span
                    className={[
                        'race-status-badge',
                        toStatusClassName(race.status),
                    ].join(' ')}
                >
                    {formatEnum(race.status)}
                </span>
            </div>

            {successMessage ? (
                <section className="race-success-message" role="status">
                    <p>{successMessage}</p>
                    <button
                        type="button"
                        onClick={handleDismissSuccessMessage}
                        aria-label="Dismiss success message"
                    >
                        Dismiss
                    </button>
                </section>
            ) : null}

            <div className="race-detail-grid">
                <section className="race-detail-panel">
                    <h2>Schedule</h2>
                    <dl className="race-detail-list">
                        <div>
                            <dt>Scheduled at</dt>
                            <dd>{formatDateTime(race.scheduledAt)}</dd>
                        </div>
                        <div>
                            <dt>Registration deadline</dt>
                            <dd>{formatDateTime(race.registrationDeadline)}</dd>
                        </div>
                        <div>
                            <dt>Race type</dt>
                            <dd>{formatEnum(race.raceType)}</dd>
                        </div>
                    </dl>
                </section>

                <section className="race-detail-panel">
                    <h2>Route and capacity</h2>
                    <dl className="race-detail-list">
                        <div>
                            <dt>Start location</dt>
                            <dd>{race.startLocation}</dd>
                        </div>
                        <div>
                            <dt>Finish location</dt>
                            <dd>{race.finishLocation}</dd>
                        </div>
                        <div>
                            <dt>Distance</dt>
                            <dd>{formatDistance(race.distanceMeters)} meters</dd>
                        </div>
                        <div>
                            <dt>Maximum participants</dt>
                            <dd>{race.maxParticipants}</dd>
                        </div>
                    </dl>
                </section>

                <section className="race-detail-panel">
                    <h2>Record information</h2>
                    <dl className="race-detail-list">
                        <div>
                            <dt>Organizer</dt>
                            <dd>{race.organizerUsername}</dd>
                        </div>
                        <div>
                            <dt>Created at</dt>
                            <dd>{formatDateTime(race.createdAt)}</dd>
                        </div>
                        <div>
                            <dt>Updated at</dt>
                            <dd>{formatDateTime(race.updatedAt)}</dd>
                        </div>
                    </dl>
                </section>
            </div>

            <div className="race-detail-actions">
                <Link
                    className="race-action-link race-action-link-secondary"
                    to="/races"
                >
                    Return to races
                </Link>

                <Link
                    className="race-action-link race-action-link-secondary"
                    to={`/races/${race.id}/registrations`}
                >
                    View registrations
                </Link>

                <Link
                    className="race-action-link race-action-link-secondary"
                    to={`/races/${race.id}/results`}
                >
                    View results
                </Link>

                {canEdit ? (
                    <Link
                        className="race-action-link"
                        to={`/races/${race.id}/edit`}
                    >
                        Edit race
                    </Link>
                ) : null}

                {canOpenStatusAction
                    ? transitions.map((transition) => (
                        <button
                            key={transition.nextStatus}
                            ref={
                                transition.nextStatus === transitions[0]?.nextStatus
                                    ? actionTriggerRef
                                    : undefined
                            }
                            type="button"
                            onClick={() => openStatusDialog(transition)}
                        >
                            {transition.actionLabel}
                        </button>
                    ))
                    : null}

                {canOpenCancelAction ? (
                    <button
                        type="button"
                        className="race-danger-button"
                        onClick={openCancelDialog}
                    >
                        Cancel race
                    </button>
                ) : null}
            </div>

            <RaceStatusDialog
                open={pendingAction !== null}
                title={pendingAction?.title ?? ''}
                description={pendingAction?.description ?? ''}
                confirmLabel={pendingAction?.confirmLabel ?? ''}
                submitting={actionSubmitting}
                error={actionError}
                onCancel={closeActionDialog}
                onConfirm={() => void confirmAction()}
            />
        </section>
    )
}