import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getApiValidationErrors } from '../../api/apiError'
import { getRegistrationsByRaceId } from '../../api/registrationsApi'
import { getRaceById } from '../../api/racesApi'
import {
    createResult,
    getResultsByRaceId,
    updateResult,
} from '../../api/resultsApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import type { RaceResponse } from '../races/raceTypes'
import { ResultDialog } from './ResultDialog'
import {
    createEmptyResultFormValues,
    createResultFormValues,
    formatResultParticipant,
    getResultStatusClassName,
    getResultStatusLabel,
    toRaceResultCreateRequest,
    toRaceResultUpdateRequest,
    validateResultForm,
    type RaceResultResponse,
    type ResultFormErrors,
    type ResultFormValues,
} from './resultTypes'

interface ResultFeedback {
    title: string
    message: string
}

interface EditingResult {
    result: RaceResultResponse
    values: ResultFormValues
}

function formatResultTime(seconds: number | null): string {
    if (seconds === null) {
        return 'Not recorded'
    }

    return `${seconds} seconds`
}

function getPageErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load race results. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view results for this race.'
    }

    if (error.status === 404) {
        return 'The requested race was not found.'
    }

    if (error.status >= 500) {
        return 'The result service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load race results. Please try again.'
}

function getActionErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to save this result. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage results for this race.'
    }

    if (error.status === 404) {
        return 'The race, registration, or result was not found.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The result service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to save this result. Please try again.'
}

function getResultStatusClassNames(status: RaceResultResponse['status']): string {
    return [
        'result-status-badge',
        getResultStatusClassName(status),
    ].join(' ')
}

function getAvailableRegistrations(
    registrations: RegistrationResponse[],
    results: RaceResultResponse[],
): RegistrationResponse[] {
    const resultRegistrationIds = new Set(
        results.map((result) => result.registrationId),
    )

    return registrations.filter(
        (registration) =>
            registration.status === 'APPROVED' &&
            !resultRegistrationIds.has(registration.id),
    )
}

export function RaceResultsPage() {
    const auth = useContext(AuthContext)
    const { raceId } = useParams()
    const actionTriggerRef = useRef<HTMLButtonElement | null>(null)

    const [race, setRace] = useState<RaceResponse | null>(null)
    const [registrations, setRegistrations] = useState<RegistrationResponse[]>(
        [],
    )
    const [results, setResults] = useState<RaceResultResponse[]>([])
    const [loading, setLoading] = useState(raceId !== undefined)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)
    const [canManageResults, setCanManageResults] = useState(false)

    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingResult, setEditingResult] = useState<EditingResult | null>(
        null,
    )
    const [formValues, setFormValues] = useState<ResultFormValues>(
        createEmptyResultFormValues,
    )
    const [formErrors, setFormErrors] = useState<ResultFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [formSubmitting, setFormSubmitting] = useState(false)
    const [feedback, setFeedback] = useState<ResultFeedback | null>(null)

    useEffect(() => {
        if (!raceId) {
            return
        }

        const currentRaceId = raceId
        let active = true

        async function loadPage() {
            try {
                const [raceResponse, resultsResponse] = await Promise.all([
                    getRaceById(currentRaceId),
                    getResultsByRaceId(currentRaceId),
                ])

                const isAdministrator = auth?.hasRole('ADMINISTRATOR') ?? false
                const isOwnerOrganizer =
                    auth?.hasRole('RACE_ORGANIZER') === true &&
                    auth.user?.username === raceResponse.organizerUsername
                const canManageLoadedResults =
                    isAdministrator || isOwnerOrganizer

                let registrationsResponse: RegistrationResponse[] = []

                if (canManageLoadedResults) {
                    registrationsResponse =
                        await getRegistrationsByRaceId(currentRaceId)
                }

                if (!active) {
                    return
                }

                setRace(raceResponse)
                setResults(resultsResponse)
                setRegistrations(registrationsResponse)
                setCanManageResults(canManageLoadedResults)
                setError(null)
            } catch (reason) {
                if (!active) {
                    return
                }

                setRace(null)
                setResults([])
                setRegistrations([])
                setCanManageResults(false)
                setError(getPageErrorMessage(reason))
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadPage()

        return () => {
            active = false
        }
    }, [auth, raceId, requestVersion])

    const availableRegistrations = useMemo(
        () => getAvailableRegistrations(registrations, results),
        [registrations, results],
    )

    const canRecordResults =
        canManageResults &&
        race?.status === 'IN_PROGRESS' &&
        availableRegistrations.length > 0

    const canEditResults =
        canManageResults &&
        race?.status === 'IN_PROGRESS'

    function handleRetry() {
        setLoading(true)
        setError(null)
        setCanManageResults(false)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    function returnFocusToActionTrigger() {
        window.setTimeout(() => {
            actionTriggerRef.current?.focus()
        }, 0)
    }

    function resetFormState() {
        setFormValues(createEmptyResultFormValues())
        setFormErrors({})
        setFormError(null)
    }

    function openCreateDialog() {
        actionTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null

        resetFormState()
        setFeedback(null)
        setShowCreateDialog(true)
    }

    function openEditDialog(result: RaceResultResponse) {
        actionTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null

        const values = createResultFormValues(result)

        setFormValues(values)
        setFormErrors({})
        setFormError(null)
        setFeedback(null)
        setEditingResult({
            result,
            values,
        })
    }

    function closeDialog() {
        if (formSubmitting) {
            return
        }

        setShowCreateDialog(false)
        setEditingResult(null)
        resetFormState()
        returnFocusToActionTrigger()
    }

    function closeFeedback() {
        setFeedback(null)
        returnFocusToActionTrigger()
    }

    async function refreshResults(currentRaceId: string) {
        const refreshedResults = await getResultsByRaceId(currentRaceId)
        setResults(refreshedResults)
    }

    async function handleCreateResult() {
        if (
            !race ||
            !raceId ||
            !canRecordResults ||
            formSubmitting
        ) {
            return
        }

        const clientErrors = validateResultForm(formValues, {
            requireRegistration: true,
        })

        if (Object.keys(clientErrors).length > 0) {
            setFormErrors(clientErrors)
            setFormError('Review the highlighted fields before saving the result.')
            return
        }

        setFormSubmitting(true)
        setFormErrors({})
        setFormError(null)

        try {
            await createResult(
                raceId,
                toRaceResultCreateRequest(formValues),
            )
            await refreshResults(raceId)

            setShowCreateDialog(false)
            resetFormState()
            setFeedback({
                title: 'Result recorded',
                message: 'Official race result was recorded successfully.',
            })
            returnFocusToActionTrigger()
        } catch (reason) {
            const validationErrors = getApiValidationErrors(reason)

            if (validationErrors) {
                setFormErrors(validationErrors)
                setFormError(
                    'Review the highlighted fields before saving the result.',
                )
            } else {
                setFormError(getActionErrorMessage(reason))
            }
        } finally {
            setFormSubmitting(false)
        }
    }

    async function handleUpdateResult() {
        if (
            !race ||
            !raceId ||
            !editingResult ||
            !canEditResults ||
            formSubmitting
        ) {
            return
        }

        const clientErrors = validateResultForm(formValues, {
            requireRegistration: false,
        })

        if (Object.keys(clientErrors).length > 0) {
            setFormErrors(clientErrors)
            setFormError('Review the highlighted fields before saving the result.')
            return
        }

        setFormSubmitting(true)
        setFormErrors({})
        setFormError(null)

        try {
            await updateResult(
                editingResult.result.id,
                toRaceResultUpdateRequest(formValues),
            )
            await refreshResults(raceId)

            setEditingResult(null)
            resetFormState()
            setFeedback({
                title: 'Result updated',
                message: 'Official race result was updated successfully.',
            })
            returnFocusToActionTrigger()
        } catch (reason) {
            const validationErrors = getApiValidationErrors(reason)

            if (validationErrors) {
                setFormErrors(validationErrors)
                setFormError(
                    'Review the highlighted fields before saving the result.',
                )
            } else {
                setFormError(getActionErrorMessage(reason))
            }
        } finally {
            setFormSubmitting(false)
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
        return <LoadingState message="Loading race results..." />
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

    return (
        <section className="race-page result-page">
            <div className="race-detail-header">
                <div>
                    <p className="race-kicker">Official result ledger</p>
                    <h1>Race results</h1>
                    <p>
                        Review official outcomes for {race.name}.
                    </p>
                </div>

                <span className="race-status-badge">
                    {race.status
                        .toLowerCase()
                        .split('_')
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ')}
                </span>
            </div>

            {feedback ? (
                <section className="result-success-message" role="status">
                    <p>{feedback.message}</p>
                    <button
                        type="button"
                        onClick={closeFeedback}
                        aria-label="Dismiss result success message"
                    >
                        Dismiss
                    </button>
                </section>
            ) : null}

            {canManageResults && race.status !== 'IN_PROGRESS' ? (
                <section className="notice-panel notice-empty">
                    <h2>Results unavailable</h2>
                    <p>
                        Official results can only be recorded or edited while a
                        race is in progress.
                    </p>
                </section>
            ) : null}

            {!canManageResults ? (
                <section className="notice-panel notice-empty">
                    <h2>Read-only access</h2>
                    <p>
                        You can review official results, but only race organizers
                        and administrators can manage them.
                    </p>
                </section>
            ) : null}

            {canRecordResults ? (
                <div className="result-primary-actions">
                    <button
                        ref={actionTriggerRef}
                        type="button"
                        onClick={openCreateDialog}
                    >
                        Record result
                    </button>
                </div>
            ) : null}

            {canManageResults &&
                race.status === 'IN_PROGRESS' &&
                availableRegistrations.length === 0 ? (
                <section className="notice-panel notice-empty">
                    <h2>No approved participants available</h2>
                    <p>
                        Every approved registration already has an official result,
                        or no registrations have been approved for this race.
                    </p>
                </section>
            ) : null}

            {results.length === 0 ? (
                <EmptyState
                    title="No official results found"
                    message="Official outcomes will appear here once race results are recorded."
                />
            ) : (
                <div className="race-table-panel table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Result status</th>
                                <th>Starting position</th>
                                <th>Final position</th>
                                <th>Completion time</th>
                                <th>Penalty time</th>
                                <th>Notes</th>
                                <th>Recorded by</th>
                                <th>Recorded at</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((result) => (
                                <tr key={result.id}>
                                    <td>{formatResultParticipant(result)}</td>
                                    <td>
                                        <span
                                            className={getResultStatusClassNames(
                                                result.status,
                                            )}
                                        >
                                            {getResultStatusLabel(result.status)}
                                        </span>
                                    </td>
                                    <td>
                                        {result.startingPosition ??
                                            'Not assigned'}
                                    </td>
                                    <td>
                                        {result.finalPosition ??
                                            'Not assigned'}
                                    </td>
                                    <td>
                                        {formatResultTime(
                                            result.completionTimeSeconds,
                                        )}
                                    </td>
                                    <td>
                                        {formatResultTime(
                                            result.penaltyTimeSeconds,
                                        )}
                                    </td>
                                    <td>{result.notes ?? 'No notes'}</td>
                                    <td>{result.recordedByUsername}</td>
                                    <td>{formatDateTime(result.recordedAt)}</td>
                                    <td>
                                        {canEditResults ? (
                                            <button
                                                type="button"
                                                className="result-edit-button"
                                                onClick={() =>
                                                    openEditDialog(result)
                                                }
                                            >
                                                Edit result
                                            </button>
                                        ) : (
                                            <span className="result-no-actions">
                                                Read only
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="race-detail-actions result-return-actions">
                <Link
                    className="race-action-link race-action-link-secondary"
                    to={`/races/${race.id}`}
                >
                    Return to race
                </Link>

                <Link
                    className="race-action-link race-action-link-secondary"
                    to={`/races/${race.id}/registrations`}
                >
                    View registrations
                </Link>
            </div>

            <ResultDialog
                isOpen={showCreateDialog}
                title="Record official result"
                description="Select an approved participant and record the official race outcome."
                values={formValues}
                fieldErrors={formErrors}
                formError={formError}
                submitting={formSubmitting}
                registrations={availableRegistrations}
                requireRegistration={true}
                onValuesChange={setFormValues}
                onSubmit={() => void handleCreateResult()}
                onCancel={closeDialog}
            />

            <ResultDialog
                isOpen={editingResult !== null}
                title="Edit official result"
                description={
                    editingResult
                        ? `Update the official result for ${formatResultParticipant(
                            editingResult.result,
                        )}.`
                        : ''
                }
                values={formValues}
                fieldErrors={formErrors}
                formError={formError}
                submitting={formSubmitting}
                registrations={[]}
                requireRegistration={false}
                onValuesChange={setFormValues}
                onSubmit={() => void handleUpdateResult()}
                onCancel={closeDialog}
            />
        </section>
    )
}