import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getApiValidationErrors } from '../../api/apiError'
import { getCompetitors } from '../../api/competitorsApi'
import {
    approveRegistration,
    cancelRegistration,
    createRegistration,
    getRegistrationsByRaceId,
    rejectRegistration,
} from '../../api/registrationsApi'
import { getRaceById } from '../../api/racesApi'
import { getTeamById, getTeams } from '../../api/teamsApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { RegistrationActionDialog } from './RegistrationActionDialog'
import { RegistrationCreateDialog } from './RegistrationCreateDialog'
import { RegistrationFeedbackDialog } from './RegistrationFeedbackDialog'
import { RegistrationRejectDialog } from './RegistrationRejectDialog'
import {
    canApproveRegistration,
    canCancelRegistration,
    canCreateRegistration,
    canRejectRegistration,
    createEmptyRegistrationApprovalFormValues,
    createEmptyRegistrationFormValues,
    formatRegistrationStatus,
    getRegistrationParticipantLabel,
    toRegistrationApprovalRequest,
    toRegistrationRequest,
    validateRegistrationApprovalForm,
    validateRegistrationForm,
    type RegistrationApprovalFormValues,
    type RegistrationFormErrors,
    type RegistrationFormValues,
    type RegistrationResponse,
} from './registrationTypes'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { RaceResponse } from '../races/raceTypes'
import type { TeamResponse } from '../teams/teamTypes'

interface PendingRegistrationAction {
    type: 'approve' | 'cancel' | 'reject'
    registration: RegistrationResponse
}

interface RegistrationFeedback {
    title: string
    message: string
}

function formatEnum(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function toRegistrationStatusClassName(status: string): string {
    return `registration-status-${status.toLowerCase()}`
}

function getPageErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load race registrations. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to view registrations for this race.'
    }

    if (error.status === 404) {
        return 'The requested race was not found.'
    }

    if (error.status >= 500) {
        return 'The registration service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load race registrations. Please try again.'
}

function getActionErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to update this registration. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage registrations for this race.'
    }

    if (error.status === 404) {
        return 'The registration was not found before the action could be completed.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The registration service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to update this registration. Please try again.'
}

function getCreateErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to create this registration. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to register participants for this race.'
    }

    if (error.status === 404) {
        return 'The race or selected participant was not found.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The registration service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to create this registration. Please try again.'
}

function createActiveCompetitorFilters() {
    return {
        status: 'ACTIVE' as const,
        page: 0,
        size: 100,
        sort: 'name,asc',
    }
}

function createActiveTeamFilters() {
    return {
        status: 'ACTIVE' as const,
        page: 0,
        size: 100,
        sort: 'name,asc',
    }
}

function supportsIndividualRegistrations(race: RaceResponse): boolean {
    return race.raceType === 'INDIVIDUAL' || race.raceType === 'MIXED'
}

function supportsTeamRegistrations(race: RaceResponse): boolean {
    return race.raceType === 'TEAM' || race.raceType === 'MIXED'
}

async function getEligibleActiveTeams(): Promise<TeamResponse[]> {
    const teamPage = await getTeams(createActiveTeamFilters())

    const teamDetails = await Promise.all(
        teamPage.content.map(async (team) => {
            try {
                return await getTeamById(team.id)
            } catch {
                return null
            }
        }),
    )

    return teamDetails.filter(
        (team): team is TeamResponse =>
            team !== null &&
            team.status === 'ACTIVE' &&
            team.members.length > 0,
    )
}

export function RaceRegistrationsPage() {
    const auth = useContext(AuthContext)
    const { raceId } = useParams()
    const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
    const createTriggerRef = useRef<HTMLButtonElement | null>(null)

    const [race, setRace] = useState<RaceResponse | null>(null)
    const [registrations, setRegistrations] = useState<RegistrationResponse[]>([])
    const [competitors, setCompetitors] = useState<CompetitorResponse[]>([])
    const [teams, setTeams] = useState<TeamResponse[]>([])
    const [loading, setLoading] = useState(raceId !== undefined)
    const [error, setError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)
    const [canManageRegistrations, setCanManageRegistrations] = useState(false)

    const [showForm, setShowForm] = useState(false)
    const [formValues, setFormValues] = useState<RegistrationFormValues>(
        createEmptyRegistrationFormValues,
    )
    const [formErrors, setFormErrors] = useState<RegistrationFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [formSubmitting, setFormSubmitting] = useState(false)

    const [pendingAction, setPendingAction] =
        useState<PendingRegistrationAction | null>(null)
    const [approvalFormValues, setApprovalFormValues] =
        useState<RegistrationApprovalFormValues>(
            createEmptyRegistrationApprovalFormValues,
        )
    const [approvalFormErrors, setApprovalFormErrors] =
        useState<RegistrationFormErrors>({})
    const [actionSubmitting, setActionSubmitting] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionNotice, setActionNotice] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<RegistrationFeedback | null>(null)

    useEffect(() => {
        if (!raceId) {
            return
        }

        const currentRaceId = raceId
        let active = true

        async function loadPage() {
            try {
                const [raceResponse, registrationsResponse] = await Promise.all([
                    getRaceById(currentRaceId),
                    getRegistrationsByRaceId(currentRaceId),
                ])

                const isAdministrator = auth?.hasRole('ADMINISTRATOR') ?? false
                const isOwnerOrganizer =
                    auth?.hasRole('RACE_ORGANIZER') === true &&
                    auth.user?.username === raceResponse.organizerUsername
                const canManageLoadedRaceRegistrations =
                    isAdministrator || isOwnerOrganizer

                let competitorResponse: CompetitorResponse[] = []
                let teamResponse: TeamResponse[] = []

                if (
                    canManageLoadedRaceRegistrations &&
                    supportsIndividualRegistrations(raceResponse)
                ) {
                    const response = await getCompetitors(
                        createActiveCompetitorFilters(),
                    )

                    competitorResponse = response.content
                }

                if (
                    canManageLoadedRaceRegistrations &&
                    supportsTeamRegistrations(raceResponse)
                ) {
                    teamResponse = await getEligibleActiveTeams()
                }

                if (!active) {
                    return
                }

                setRace(raceResponse)
                setRegistrations(registrationsResponse)
                setCompetitors(competitorResponse)
                setTeams(teamResponse)
                setCanManageRegistrations(canManageLoadedRaceRegistrations)
                setError(null)
            } catch (reason) {
                if (!active) {
                    return
                }

                setRace(null)
                setRegistrations([])
                setCompetitors([])
                setTeams([])
                setCanManageRegistrations(false)
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

    const occupiedCapacity = useMemo(
        () =>
            registrations.filter(
                (registration) => registration.status === 'APPROVED',
            ).length,
        [registrations],
    )

    const availableStartingPositions = useMemo(() => {
        if (!race) {
            return []
        }

        const assignedPositions = new Set(
            registrations
                .filter(
                    (registration) =>
                        registration.status === 'APPROVED' &&
                        registration.startingPosition !== null,
                )
                .map((registration) => registration.startingPosition),
        )

        return Array.from(
            { length: race.maxParticipants },
            (_, index) => index + 1,
        ).filter((position) => !assignedPositions.has(position))
    }, [race, registrations])

    function handleRetry() {
        setLoading(true)
        setError(null)
        setCanManageRegistrations(false)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    function returnFocusToCreateTrigger() {
        window.setTimeout(() => {
            createTriggerRef.current?.focus()
        }, 0)
    }

    function returnFocusToActionTrigger() {
        window.setTimeout(() => {
            actionTriggerRef.current?.focus()
        }, 0)
    }

    function createInitialFormValues(): RegistrationFormValues {
        if (race?.raceType === 'TEAM') {
            return {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            }
        }

        return createEmptyRegistrationFormValues()
    }

    function openForm() {
        createTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null
        setFormValues(createInitialFormValues())
        setFormErrors({})
        setFormError(null)
        setActionNotice(null)
        setShowForm(true)
    }

    function closeForm() {
        if (formSubmitting) {
            return
        }

        setShowForm(false)
        setFormErrors({})
        setFormError(null)
        returnFocusToCreateTrigger()
    }

    function closeFeedback() {
        setFeedback(null)
        returnFocusToActionTrigger()
    }

    async function handleCreateRegistration() {
        if (!race || !raceId || !canManageRegistrations || formSubmitting) {
            return
        }

        const clientErrors = validateRegistrationForm(formValues)

        if (Object.keys(clientErrors).length > 0) {
            setFormErrors(clientErrors)
            setFormError(
                'Review the highlighted fields before saving the registration.',
            )
            return
        }

        setFormSubmitting(true)
        setFormErrors({})
        setFormError(null)
        setActionNotice(null)

        try {
            const createdRegistration = await createRegistration(
                raceId,
                toRegistrationRequest(formValues),
            )

            setRegistrations((currentRegistrations) => [
                ...currentRegistrations,
                createdRegistration,
            ])
            setFormValues(createInitialFormValues())
            setShowForm(false)
            setFeedback({
                title: 'Registration created',
                message: 'Participant registration was created successfully.',
            })
            returnFocusToCreateTrigger()
        } catch (reason) {
            const validationErrors = getApiValidationErrors(reason)

            if (validationErrors) {
                setFormErrors(validationErrors)
                setFormError(
                    'Review the highlighted fields before saving the registration.',
                )
            } else {
                setFormError(getCreateErrorMessage(reason))
            }
        } finally {
            setFormSubmitting(false)
        }
    }

    function openAction(
        type: PendingRegistrationAction['type'],
        registration: RegistrationResponse,
    ) {
        if (!canManageRegistrations) {
            return
        }

        actionTriggerRef.current =
            document.activeElement instanceof HTMLButtonElement
                ? document.activeElement
                : null

        setActionError(null)
        setActionNotice(null)
        setApprovalFormValues(createEmptyRegistrationApprovalFormValues())
        setApprovalFormErrors({})

        if (type === 'approve') {
            if (!race) {
                return
            }

            if (occupiedCapacity >= race.maxParticipants) {
                setActionNotice(
                    'Race capacity has been reached. Reject or cancel an approved registration before approving another participant.',
                )
                return
            }

            if (availableStartingPositions.length === 0) {
                setActionNotice(
                    'No starting positions are available. Reject or cancel an approved registration before approving another participant.',
                )
                return
            }
        }

        setPendingAction({
            type,
            registration,
        })
    }

    function closeAction() {
        if (actionSubmitting) {
            return
        }

        setPendingAction(null)
        setApprovalFormErrors({})
        setActionError(null)
        returnFocusToActionTrigger()
    }

    function replaceRegistration(updatedRegistration: RegistrationResponse) {
        setRegistrations((currentRegistrations) =>
            currentRegistrations.map((registration) =>
                registration.id === updatedRegistration.id
                    ? updatedRegistration
                    : registration,
            ),
        )
    }

    async function handleApproveRegistration() {
        if (
            !pendingAction ||
            pendingAction.type !== 'approve' ||
            !canManageRegistrations ||
            actionSubmitting
        ) {
            return
        }

        const clientErrors = validateRegistrationApprovalForm(
            approvalFormValues,
        )

        if (Object.keys(clientErrors).length > 0) {
            setApprovalFormErrors(clientErrors)
            return
        }

        setActionSubmitting(true)
        setApprovalFormErrors({})
        setActionError(null)

        try {
            const updatedRegistration = await approveRegistration(
                pendingAction.registration.id,
                toRegistrationApprovalRequest(approvalFormValues),
            )

            replaceRegistration(updatedRegistration)
            setPendingAction(null)
            setFeedback({
                title: 'Registration approved',
                message: 'Registration was approved successfully.',
            })
        } catch (reason) {
            const validationErrors = getApiValidationErrors(reason)

            if (validationErrors) {
                setApprovalFormErrors(validationErrors)
            } else {
                setActionError(getActionErrorMessage(reason))
            }
        } finally {
            setActionSubmitting(false)
        }
    }

    async function handleRejectRegistration(reason: string) {
        if (
            !pendingAction ||
            pendingAction.type !== 'reject' ||
            !canManageRegistrations ||
            actionSubmitting
        ) {
            return
        }

        setActionSubmitting(true)
        setActionError(null)

        try {
            const updatedRegistration = await rejectRegistration(
                pendingAction.registration.id,
                reason,
            )

            replaceRegistration(updatedRegistration)
            setPendingAction(null)
            setFeedback({
                title: 'Registration rejected',
                message: 'Registration was rejected successfully.',
            })
        } catch (reason) {
            setActionError(getActionErrorMessage(reason))
        } finally {
            setActionSubmitting(false)
        }
    }

    async function handleCancelRegistration() {
        if (
            !pendingAction ||
            pendingAction.type !== 'cancel' ||
            !canManageRegistrations ||
            actionSubmitting
        ) {
            return
        }

        setActionSubmitting(true)
        setActionError(null)

        try {
            await cancelRegistration(pendingAction.registration.id)

            replaceRegistration({
                ...pendingAction.registration,
                status: 'CANCELLED',
            })
            setPendingAction(null)
            setFeedback({
                title: 'Registration cancelled',
                message: 'Registration was cancelled successfully.',
            })
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
        return <LoadingState message="Loading race registrations..." />
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

    const canCreate =
        canManageRegistrations &&
        canCreateRegistration(race.raceType, race.status)

    const createAvailabilityMessage =
        race.raceType === 'TEAM'
            ? 'Team registrations require a Team race that is open for registration.'
            : race.raceType === 'MIXED'
                ? 'Individual and team registrations require a Mixed race that is open for registration.'
                : 'Individual registrations require an Individual race that is open for registration.'

    return (
        <section className="race-page registration-page">
            <div className="race-detail-header">
                <div>
                    <p className="race-kicker">Registration ledger</p>
                    <h1>Race registrations</h1>
                    <p>
                        Manage participant registrations for {race.name}.
                    </p>
                </div>

                <span className="race-status-badge">
                    {formatEnum(race.raceType)}
                </span>
            </div>

            <div className="registration-summary-grid">
                <section className="race-detail-panel">
                    <h2>Race status</h2>
                    <p>{formatEnum(race.status)}</p>
                </section>

                <section className="race-detail-panel">
                    <h2>Occupied capacity</h2>
                    <p>
                        {occupiedCapacity} of {race.maxParticipants}
                    </p>
                </section>

                <section className="race-detail-panel">
                    <h2>Registration deadline</h2>
                    <p>{formatDateTime(race.registrationDeadline)}</p>
                </section>
            </div>

            {actionNotice ? (
                <section
                    className="registration-form-error"
                    role="alert"
                    tabIndex={-1}
                >
                    <h2>Registration approval unavailable</h2>
                    <p>{actionNotice}</p>
                    <button
                        type="button"
                        className="registration-secondary-button"
                        onClick={() => setActionNotice(null)}
                    >
                        Dismiss
                    </button>
                </section>
            ) : null}

            {canCreate ? (
                <div className="registration-primary-actions">
                    <button
                        ref={createTriggerRef}
                        type="button"
                        onClick={openForm}
                    >
                        Register participant
                    </button>
                </div>
            ) : null}

            {!canManageRegistrations ? (
                <section className="notice-panel notice-empty">
                    <h2>Read-only access</h2>
                    <p>
                        You can review registrations, but only race organizers and
                        administrators can manage them.
                    </p>
                </section>
            ) : null}

            {canManageRegistrations && !canCreate ? (
                <section className="notice-panel notice-empty">
                    <h2>New registrations unavailable</h2>
                    <p>{createAvailabilityMessage}</p>
                </section>
            ) : null}

            {registrations.length === 0 ? (
                <EmptyState
                    title="No registrations found"
                    message="No participants have been registered for this race yet."
                />
            ) : (
                <div className="race-table-panel table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Status</th>
                                <th>Starting position</th>
                                <th>Registered at</th>
                                <th>Registered by</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map((registration) => {
                                const participantLabel =
                                    getRegistrationParticipantLabel(registration)

                                return (
                                    <tr key={registration.id}>
                                        <td>{participantLabel}</td>
                                        <td>
                                            <span
                                                className={[
                                                    'registration-status-badge',
                                                    toRegistrationStatusClassName(
                                                        registration.status,
                                                    ),
                                                ].join(' ')}
                                            >
                                                {formatRegistrationStatus(
                                                    registration.status,
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            {registration.startingPosition ??
                                                'Not assigned'}
                                        </td>
                                        <td>
                                            {formatDateTime(
                                                registration.registeredAt,
                                            )}
                                        </td>
                                        <td>
                                            {registration.registeredByUsername}
                                        </td>
                                        <td>
                                            {registration.validationNotes ??
                                                'No notes'}
                                        </td>
                                        <td>
                                            {canManageRegistrations ? (
                                                <div className="registration-row-actions">
                                                    {canApproveRegistration(
                                                        registration.status,
                                                    ) ? (
                                                        <button
                                                            type="button"
                                                            className="registration-approve-button"
                                                            onClick={() =>
                                                                openAction(
                                                                    'approve',
                                                                    registration,
                                                                )
                                                            }
                                                        >
                                                            Approve
                                                        </button>
                                                    ) : null}

                                                    {canRejectRegistration(
                                                        registration.status,
                                                    ) ? (
                                                        <button
                                                            type="button"
                                                            className="registration-warning-button"
                                                            onClick={() =>
                                                                openAction(
                                                                    'reject',
                                                                    registration,
                                                                )
                                                            }
                                                        >
                                                            Reject
                                                        </button>
                                                    ) : null}

                                                    {canCancelRegistration(
                                                        registration.status,
                                                    ) ? (
                                                        <button
                                                            type="button"
                                                            className="registration-cancel-button"
                                                            onClick={() =>
                                                                openAction(
                                                                    'cancel',
                                                                    registration,
                                                                )
                                                            }
                                                        >
                                                            Cancel
                                                        </button>
                                                    ) : null}

                                                    {!canApproveRegistration(
                                                        registration.status,
                                                    ) &&
                                                        !canRejectRegistration(
                                                            registration.status,
                                                        ) &&
                                                        !canCancelRegistration(
                                                            registration.status,
                                                        ) ? (
                                                        <span className="registration-no-actions">
                                                            No actions available
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="registration-no-actions">
                                                    Read only
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="race-detail-actions registration-return-actions">
                <Link
                    className="race-action-link race-action-link-secondary"
                    to="/registrations"
                >
                    Return to registrations
                </Link>

                <Link
                    className="race-action-link race-action-link-secondary"
                    to={`/races/${race.id}`}
                >
                    Return to race
                </Link>
            </div>

            <RegistrationCreateDialog
                isOpen={showForm}
                values={formValues}
                fieldErrors={formErrors}
                formError={formError}
                submitting={formSubmitting}
                raceType={race.raceType}
                competitors={competitors}
                teams={teams}
                onValuesChange={setFormValues}
                onSubmit={() => void handleCreateRegistration()}
                onCancel={closeForm}
            />

            <RegistrationActionDialog
                isOpen={pendingAction?.type === 'approve'}
                title="Approve registration"
                description={
                    pendingAction
                        ? `Approve ${getRegistrationParticipantLabel(
                            pendingAction.registration,
                        )} for this race?`
                        : ''
                }
                confirmLabel="Approve registration"
                cancelLabel="Keep pending"
                submitting={actionSubmitting}
                error={actionError}
                startingPosition={approvalFormValues.startingPosition}
                startingPositionError={approvalFormErrors.startingPosition}
                availableStartingPositions={availableStartingPositions}
                onStartingPositionChange={(value) => {
                    setApprovalFormValues({
                        startingPosition: value,
                    })
                    setApprovalFormErrors({})
                }}
                onConfirm={() => void handleApproveRegistration()}
                onCancel={closeAction}
            />

            <RegistrationActionDialog
                isOpen={pendingAction?.type === 'cancel'}
                title="Cancel registration"
                description={
                    pendingAction
                        ? `Cancel the registration for ${getRegistrationParticipantLabel(
                            pendingAction.registration,
                        )}? This action changes the registration status to cancelled.`
                        : ''
                }
                confirmLabel="Cancel registration"
                cancelLabel="Keep registration"
                submitting={actionSubmitting}
                error={actionError}
                onConfirm={() => void handleCancelRegistration()}
                onCancel={closeAction}
            />

            <RegistrationRejectDialog
                isOpen={pendingAction?.type === 'reject'}
                registrationLabel={
                    pendingAction
                        ? getRegistrationParticipantLabel(
                            pendingAction.registration,
                        )
                        : ''
                }
                submitting={actionSubmitting}
                error={actionError}
                onConfirm={(reason) => void handleRejectRegistration(reason)}
                onCancel={closeAction}
            />

            <RegistrationFeedbackDialog
                isOpen={feedback !== null}
                title={feedback?.title ?? ''}
                message={feedback?.message ?? ''}
                onClose={closeFeedback}
            />
        </section>
    )
}