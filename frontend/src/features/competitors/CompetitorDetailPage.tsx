import { useContext, useEffect, useRef, useState } from 'react'
import {
    Link,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom'
import { ApiError } from '../../api/apiError'
import {
    getCompetitorById,
    retireCompetitor,
    updateCompetitorStatus,
} from '../../api/competitorsApi'
import { AuthContext } from '../../auth/AuthContext'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDate, formatDateTime } from '../../utils/dateFormat'
import { CompetitorStatusDialog } from './CompetitorStatusDialog'
import {
    getCompetitorStatusOptions,
    isRetiredCompetitor,
    type CompetitorResponse,
    type CompetitorStatus,
    type CompetitorStatusOption,
} from './competitorTypes'

interface DetailLocationState {
    successMessage?: string
}

interface PendingCompetitorAction {
    type: 'status' | 'retire'
    targetStatus?: CompetitorStatus
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

function formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2,
    }).format(value)
}

function toStatusClassName(status: CompetitorStatus): string {
    return `competitor-status-${status.toLowerCase()}`
}

function getDetailErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load this competitor. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view this competitor.'
    }

    if (error.status === 404) {
        return 'The requested competitor was not found.'
    }

    if (error.status >= 500) {
        return 'The competitor service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load this competitor. Please try again.'
}

function getActionErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to update this competitor. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage this competitor.'
    }

    if (error.status === 404) {
        return 'The competitor was not found before the action could be completed.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The competitor service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to update this competitor. Please try again.'
}

function getAgeReference(competitor: CompetitorResponse): string {
    if (competitor.dateOfBirth) {
        return formatDate(competitor.dateOfBirth)
    }

    if (competitor.approximateAge !== null) {
        return `Approx. ${competitor.approximateAge} years`
    }

    return 'Not available'
}

export function CompetitorDetailPage() {
    const auth = useContext(AuthContext)
    const location = useLocation()
    const navigate = useNavigate()
    const { competitorId } = useParams()
    const actionTriggerRef = useRef<HTMLButtonElement | null>(null)

    const [competitor, setCompetitor] = useState<CompetitorResponse | null>(
        null,
    )
    const [loading, setLoading] = useState(competitorId !== undefined)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)
    const [dismissedLocationMessage, setDismissedLocationMessage] =
        useState(false)
    const [actionSuccessMessage, setActionSuccessMessage] = useState<
        string | null
    >(null)
    const [pendingAction, setPendingAction] =
        useState<PendingCompetitorAction | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionSubmitting, setActionSubmitting] = useState(false)

    const locationSuccessMessage =
        (location.state as DetailLocationState | null)?.successMessage ?? null
    const successMessage =
        actionSuccessMessage ??
        (dismissedLocationMessage ? null : locationSuccessMessage)

    const canManageCompetitors = auth?.hasRole('ADMINISTRATOR') ?? false

    useEffect(() => {
        if (!competitorId) {
            return
        }

        let active = true

        void getCompetitorById(competitorId)
            .then((response) => {
                if (active) {
                    setCompetitor(response)
                    setError(null)
                }
            })
            .catch((reason: unknown) => {
                if (active) {
                    setCompetitor(null)
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
    }, [competitorId, requestVersion])

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

    function openStatusDialog(
        option: CompetitorStatusOption,
        trigger: HTMLButtonElement,
    ) {
        actionTriggerRef.current = trigger

        setActionError(null)
        setPendingAction({
            type: 'status',
            targetStatus: option.status,
            title: option.actionLabel,
            description: option.description,
            confirmLabel: option.actionLabel,
        })
    }

    function openRetireDialog(trigger: HTMLButtonElement) {
        if (!competitor) {
            return
        }

        actionTriggerRef.current = trigger

        setActionError(null)
        setPendingAction({
            type: 'retire',
            title: 'Retire competitor',
            description:
                'Retiring this competitor is irreversible. Retired competitors cannot be reactivated.',
            confirmLabel: 'Retire competitor',
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
        if (!competitor || !pendingAction || actionSubmitting) {
            return
        }

        setActionSubmitting(true)
        setActionError(null)

        try {
            if (pendingAction.type === 'retire') {
                await retireCompetitor(competitor.id)
                setCompetitor({
                    ...competitor,
                    status: 'RETIRED',
                })
                setActionSuccessMessage('Competitor was retired successfully.')
            } else if (pendingAction.targetStatus) {
                const updatedCompetitor = await updateCompetitorStatus(
                    competitor.id,
                    {
                        status: pendingAction.targetStatus,
                    },
                )

                setCompetitor(updatedCompetitor)
                setActionSuccessMessage(
                    `Competitor status changed to ${formatEnum(
                        updatedCompetitor.status,
                    )}.`,
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

    if (!competitorId) {
        return (
            <section className="competitor-page">
                <div className="competitor-error">
                    <ErrorState message="The requested competitor was not found." />
                    <Link className="competitor-action-link" to="/competitors">
                        Return to competitors
                    </Link>
                </div>
            </section>
        )
    }

    if (loading) {
        return <LoadingState message="Loading competitor detail..." />
    }

    if (error) {
        const isNotFound = error === 'The requested competitor was not found.'

        return (
            <section className="competitor-page">
                <div className="competitor-error">
                    <ErrorState message={error} />
                    {isNotFound ? (
                        <Link
                            className="competitor-action-link"
                            to="/competitors"
                        >
                            Return to competitors
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

    if (!competitor) {
        return null
    }

    const retired = isRetiredCompetitor(competitor.status)
    const statusOptions = getCompetitorStatusOptions(competitor.status)
    const canEdit = canManageCompetitors && !retired
    const canChangeStatus = canManageCompetitors && !retired
    const canRetire = canManageCompetitors && !retired

    return (
        <section className="competitor-page">
            <div className="competitor-detail-header">
                <div>
                    <p className="competitor-kicker">Competitor record</p>
                    <h1>{competitor.name}</h1>
                    <p>Known on the track as {competitor.nickname}.</p>
                </div>

                <span
                    className={[
                        'competitor-status-badge',
                        toStatusClassName(competitor.status),
                    ].join(' ')}
                >
                    {formatEnum(competitor.status)}
                </span>
            </div>

            {successMessage ? (
                <section className="competitor-success-message" role="status">
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

            <div className="competitor-detail-grid">
                <section className="competitor-detail-panel">
                    <h2>Identity</h2>
                    <dl className="competitor-detail-list">
                        <div>
                            <dt>Nickname</dt>
                            <dd>{competitor.nickname}</dd>
                        </div>
                        <div>
                            <dt>Competitor type</dt>
                            <dd>{formatEnum(competitor.competitorType)}</dd>
                        </div>
                        <div>
                            <dt>Origin</dt>
                            <dd>{competitor.origin}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd>{formatEnum(competitor.status)}</dd>
                        </div>
                    </dl>
                </section>

                <section className="competitor-detail-panel">
                    <h2>Physical profile</h2>
                    <dl className="competitor-detail-list">
                        <div>
                            <dt>Age reference</dt>
                            <dd>{getAgeReference(competitor)}</dd>
                        </div>
                        <div>
                            <dt>Weight</dt>
                            <dd>{formatNumber(competitor.weightKg)} kg</dd>
                        </div>
                        <div>
                            <dt>Height</dt>
                            <dd>{formatNumber(competitor.heightCm)} cm</dd>
                        </div>
                    </dl>
                </section>

                <section className="competitor-detail-panel">
                    <h2>Competitive record</h2>
                    <dl className="competitor-detail-list">
                        <div>
                            <dt>Victories</dt>
                            <dd>{competitor.victories}</dd>
                        </div>
                        <div>
                            <dt>Defeats</dt>
                            <dd>{competitor.defeats}</dd>
                        </div>
                        <div>
                            <dt>Completed races</dt>
                            <dd>{competitor.completedRaces}</dd>
                        </div>
                        <div>
                            <dt>Registration date</dt>
                            <dd>{formatDateTime(competitor.registrationDate)}</dd>
                        </div>
                    </dl>
                </section>
            </div>

            <div className="competitor-detail-actions">
                <Link
                    className="competitor-action-link competitor-action-link-secondary"
                    to="/competitors"
                >
                    Return to competitors
                </Link>

                {canEdit ? (
                    <Link
                        className="competitor-action-link"
                        to={`/competitors/${competitor.id}/edit`}
                    >
                        Edit competitor
                    </Link>
                ) : null}

                {canChangeStatus
                    ? statusOptions.map((option) => (
                        <button
                            key={option.status}
                            type="button"
                            onClick={(event) =>
                                openStatusDialog(option, event.currentTarget)
                            }
                        >
                            {option.actionLabel}
                        </button>
                    ))
                    : null}

                {canRetire ? (
                    <button
                        type="button"
                        className="competitor-danger-button"
                        onClick={(event) =>
                            openRetireDialog(event.currentTarget)
                        }
                    >
                        Retire competitor
                    </button>
                ) : null}
            </div>

            <CompetitorStatusDialog
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