import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, getApiValidationErrors } from '../../api/apiError'
import {
    createRace,
    getRaceById,
    updateRace,
} from '../../api/racesApi'
import { AuthContext } from '../../auth/AuthContext'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { RaceForm } from './RaceForm'
import {
    createEmptyRaceFormValues,
    createRaceFormValues,
    isRaceLockedForUpdate,
    toRaceRequest,
    validateRaceForm,
    type RaceFormErrors,
    type RaceFormValues,
} from './raceTypes'

function getLoadErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load this race. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage this race.'
    }

    if (error.status === 404) {
        return 'The race you want to edit was not found.'
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load this race. Please try again.'
}

function getFormErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to save the race. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to save this race.'
    }

    if (error.status === 404) {
        return 'The race could not be found before it was saved.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The race service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to save the race. Please try again.'
}

export function RaceFormPage() {
    const auth = useContext(AuthContext)
    const navigate = useNavigate()
    const { raceId } = useParams()
    const isEditMode = raceId !== undefined
    const submitLockRef = useRef(false)

    const [values, setValues] = useState<RaceFormValues>(
        createEmptyRaceFormValues,
    )
    const [fieldErrors, setFieldErrors] = useState<RaceFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [loading, setLoading] = useState(isEditMode)
    const [submitting, setSubmitting] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [lockedRace, setLockedRace] = useState(false)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        if (!isEditMode || !raceId) {
            return
        }

        let active = true

        void getRaceById(raceId)
            .then((race) => {
                if (!active) {
                    return
                }

                const isAdministrator = auth?.hasRole('ADMINISTRATOR') ?? false
                const isOwnerOrganizer =
                    auth?.hasRole('RACE_ORGANIZER') === true &&
                    auth.user?.username === race.organizerUsername
                const canManageRace = isAdministrator || isOwnerOrganizer

                if (!canManageRace) {
                    navigate('/forbidden', { replace: true })
                    return
                }

                setValues(createRaceFormValues(race))
                setLockedRace(isRaceLockedForUpdate(race.status))
                setLoadError(null)
            })
            .catch((error: unknown) => {
                if (active) {
                    setLoadError(getLoadErrorMessage(error))
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
    }, [auth, isEditMode, navigate, raceId, requestVersion])

    function handleValuesChange(nextValues: RaceFormValues) {
        setValues(nextValues)
        setFieldErrors({})
        setFormError(null)
    }

    function handleRetryLoad() {
        setLoading(true)
        setLoadError(null)
        setRequestVersion((currentVersion) => currentVersion + 1)
    }

    async function handleSubmit() {
        if (submitting || submitLockRef.current) {
            return
        }

        const nextFieldErrors = validateRaceForm(values)

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors)
            setFormError('Review the highlighted fields before saving the race.')
            return
        }

        if (isEditMode && lockedRace) {
            setFormError('In-progress or terminal races cannot be updated.')
            return
        }

        submitLockRef.current = true
        setSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const request = toRaceRequest(values)
            const race = isEditMode && raceId
                ? await updateRace(raceId, request)
                : await createRace(request)

            navigate(`/races/${race.id}`, {
                replace: true,
                state: {
                    successMessage: isEditMode
                        ? 'Race changes were saved.'
                        : 'Race was created successfully.',
                },
            })
        } catch (error) {
            const backendFieldErrors = getApiValidationErrors(error)

            if (backendFieldErrors) {
                setFieldErrors(backendFieldErrors)
            }

            setFormError(getFormErrorMessage(error))
        } finally {
            submitLockRef.current = false
            setSubmitting(false)
        }
    }

    if (loading) {
        return <LoadingState message="Loading race for editing..." />
    }

    if (loadError) {
        return (
            <section className="race-page">
                <div className="race-error">
                    <ErrorState message={loadError} />
                    <button
                        type="button"
                        onClick={handleRetryLoad}
                        disabled={loading}
                    >
                        Retry
                    </button>
                </div>
            </section>
        )
    }

    if (isEditMode && lockedRace) {
        return (
            <section className="race-page">
                <div className="race-archive-heading">
                    <p className="race-kicker">Race management</p>
                    <h1>Race cannot be edited</h1>
                    <p>
                        In-progress, completed and cancelled races are locked
                        records and cannot be updated.
                    </p>
                </div>

                <div className="race-form-actions">
                    <button
                        type="button"
                        onClick={() => navigate(`/races/${raceId}`)}
                    >
                        Return to race detail
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="race-page">
            <div className="race-archive-heading">
                <p className="race-kicker">Race management</p>
                <h1>{isEditMode ? 'Edit race' : 'Create race'}</h1>
                <p>
                    {isEditMode
                        ? 'Update the race details before continuing with its next stage.'
                        : 'Create a new race schedule for the desert racing calendar.'}
                </p>
            </div>

            <RaceForm
                values={values}
                fieldErrors={fieldErrors}
                formError={formError}
                submitting={submitting}
                submitLabel={isEditMode ? 'Save changes' : 'Create race'}
                submittingLabel={
                    isEditMode ? 'Saving changes...' : 'Creating race...'
                }
                onValuesChange={handleValuesChange}
                onSubmit={() => void handleSubmit()}
                onCancel={() =>
                    navigate(isEditMode && raceId ? `/races/${raceId}` : '/races')
                }
            />
        </section>
    )
}