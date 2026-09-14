import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, getApiValidationErrors } from '../../api/apiError'
import {
    createCompetitor,
    getCompetitorById,
    updateCompetitor,
} from '../../api/competitorsApi'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { CompetitorForm } from './CompetitorForm'
import {
    createCompetitorFormValues,
    createEmptyCompetitorFormValues,
    setCompetitorAgeReferenceType,
    toCompetitorRequest,
    validateCompetitorForm,
    type AgeReferenceType,
    type CompetitorFormErrors,
    type CompetitorFormValues,
} from './competitorTypes'

function getLoadErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to load this competitor. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to manage this competitor.'
    }

    if (error.status === 404) {
        return 'The competitor you want to edit was not found.'
    }

    if (error.status >= 500) {
        return 'The competitor service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to load this competitor. Please try again.'
}

function getFormErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return 'Unable to save the competitor. Please try again.'
    }

    if (error.status === 401) {
        return 'Your session is not available. Please sign in again.'
    }

    if (error.status === 403) {
        return 'You do not have permission to save this competitor.'
    }

    if (error.status === 404) {
        return 'The competitor could not be found before it was saved.'
    }

    if (error.status === 409) {
        return error.message
    }

    if (error.status >= 500) {
        return 'The competitor service is currently unavailable. Please try again.'
    }

    return error.message || 'Unable to save the competitor. Please try again.'
}

function mapBackendFieldErrors(
    errors: Record<string, string>,
): CompetitorFormErrors {
    const mappedErrors: CompetitorFormErrors = {}

    for (const [field, message] of Object.entries(errors)) {
        if (
            field === 'name' ||
            field === 'nickname' ||
            field === 'competitorType' ||
            field === 'dateOfBirth' ||
            field === 'approximateAge' ||
            field === 'weightKg' ||
            field === 'heightCm' ||
            field === 'origin'
        ) {
            mappedErrors[field] = message
        } else {
            mappedErrors.ageReference = message
        }
    }

    return mappedErrors
}

export function CompetitorFormPage() {
    const navigate = useNavigate()
    const { competitorId } = useParams()
    const isEditMode = competitorId !== undefined
    const submitLockRef = useRef(false)

    const [values, setValues] = useState<CompetitorFormValues>(
        createEmptyCompetitorFormValues,
    )
    const [fieldErrors, setFieldErrors] = useState<CompetitorFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [loading, setLoading] = useState(isEditMode)
    const [submitting, setSubmitting] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        if (!isEditMode || !competitorId) {
            return
        }

        let active = true

        void getCompetitorById(competitorId)
            .then((competitor) => {
                if (!active) {
                    return
                }

                setValues(createCompetitorFormValues(competitor))
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
    }, [competitorId, isEditMode, requestVersion])

    function handleValuesChange(nextValues: CompetitorFormValues) {
        setValues(nextValues)
        setFieldErrors({})
        setFormError(null)
    }

    function handleAgeReferenceTypeChange(
        ageReferenceType: AgeReferenceType,
    ) {
        setValues((currentValues) =>
            setCompetitorAgeReferenceType(currentValues, ageReferenceType),
        )
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

        const nextFieldErrors = validateCompetitorForm(values)

        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors)
            setFormError(
                'Review the highlighted fields before saving the competitor.',
            )
            return
        }

        submitLockRef.current = true
        setSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const request = toCompetitorRequest(values)
            const competitor =
                isEditMode && competitorId
                    ? await updateCompetitor(competitorId, request)
                    : await createCompetitor(request)

            navigate(`/competitors/${competitor.id}`, {
                replace: true,
                state: {
                    successMessage: isEditMode
                        ? 'Competitor changes were saved.'
                        : 'Competitor was created successfully.',
                },
            })
        } catch (error) {
            const backendFieldErrors = getApiValidationErrors(error)

            if (backendFieldErrors) {
                setFieldErrors(mapBackendFieldErrors(backendFieldErrors))
            }

            setFormError(getFormErrorMessage(error))
        } finally {
            submitLockRef.current = false
            setSubmitting(false)
        }
    }

    if (loading) {
        return <LoadingState message="Loading competitor for editing..." />
    }

    if (loadError) {
        return (
            <section className="competitor-page">
                <div className="competitor-error">
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

    return (
        <section className="competitor-page">
            <div className="competitor-archive-heading">
                <p className="competitor-kicker">Competitor management</p>
                <h1>
                    {isEditMode ? 'Edit competitor' : 'Create competitor'}
                </h1>
                <p>
                    {isEditMode
                        ? 'Update the competitor profile while preserving official status and race statistics.'
                        : 'Create a competitor profile for the desert racing registry.'}
                </p>
            </div>

            <CompetitorForm
                values={values}
                fieldErrors={fieldErrors}
                formError={formError}
                submitting={submitting}
                submitLabel={
                    isEditMode ? 'Save changes' : 'Create competitor'
                }
                submittingLabel={
                    isEditMode
                        ? 'Saving changes...'
                        : 'Creating competitor...'
                }
                onValuesChange={handleValuesChange}
                onAgeReferenceTypeChange={handleAgeReferenceTypeChange}
                onSubmit={() => void handleSubmit()}
                onCancel={() =>
                    navigate(
                        isEditMode && competitorId
                            ? `/competitors/${competitorId}`
                            : '/competitors',
                    )
                }
            />
        </section>
    )
}