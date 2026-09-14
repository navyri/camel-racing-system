import {
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
    useEffect,
    useRef,
} from 'react'
import {
    raceTypes,
    type RaceFormErrors,
    type RaceFormValues,
    type RaceType,
} from './raceTypes'

interface RaceFormProps {
    values: RaceFormValues
    fieldErrors: RaceFormErrors
    formError: string | null
    submitting: boolean
    submitLabel: string
    submittingLabel: string
    onValuesChange: (values: RaceFormValues) => void
    onSubmit: () => void
    onCancel: () => void
}

interface RaceFieldProps {
    id: string
    name: keyof RaceFormValues
    label: string
    error?: string
    hint?: string
    children: ReactNode
}

function RaceField({
    id,
    name,
    label,
    error,
    hint,
    children,
}: RaceFieldProps) {
    const errorId = error ? `race-field-error-${name}` : undefined
    const hintId = hint ? `race-field-hint-${name}` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
        <div className="race-form-field">
            <label htmlFor={id}>{label}</label>
            {children}
            {hint ? (
                <span id={hintId} className="race-field-hint">
                    {hint}
                </span>
            ) : null}
            {error ? (
                <span id={errorId} className="race-field-error">
                    {error}
                </span>
            ) : null}
            <input
                type="hidden"
                aria-hidden="true"
                value={describedBy}
                readOnly
            />
        </div>
    )
}

function formatRaceType(value: RaceType): string {
    return value.charAt(0) + value.slice(1).toLowerCase()
}

export function RaceForm({
    values,
    fieldErrors,
    formError,
    submitting,
    submitLabel,
    submittingLabel,
    onValuesChange,
    onSubmit,
    onCancel,
}: RaceFormProps) {
    const formErrorRef = useRef<HTMLDivElement | null>(null)
    const hasFieldErrors = Object.keys(fieldErrors).length > 0

    useEffect(() => {
        if (formError || hasFieldErrors) {
            formErrorRef.current?.focus()
        }
    }, [formError, hasFieldErrors])

    function updateValue(
        name: keyof RaceFormValues,
        value: string,
    ) {
        onValuesChange({
            ...values,
            [name]: value,
        })
    }

    function handleInputChange(
        event: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) {
        updateValue(
            event.target.name as keyof RaceFormValues,
            event.target.value,
        )
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (submitting) {
            return
        }

        onSubmit()
    }

    function getFieldDescribedBy(
        name: keyof RaceFormValues,
        hasHint = false,
    ): string | undefined {
        const describedBy = []

        if (hasHint) {
            describedBy.push(`race-field-hint-${name}`)
        }

        if (fieldErrors[name]) {
            describedBy.push(`race-field-error-${name}`)
        }

        return describedBy.length > 0 ? describedBy.join(' ') : undefined
    }

    return (
        <form className="race-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
                <div
                    ref={formErrorRef}
                    className="race-form-error"
                    role="alert"
                    tabIndex={-1}
                >
                    <h2>Review race information</h2>
                    <p>{formError}</p>
                </div>
            ) : null}

            <div className="race-form-grid">
                <RaceField
                    id="race-name"
                    name="name"
                    label="Race name"
                    error={fieldErrors.name}
                >
                    <input
                        id="race-name"
                        name="name"
                        type="text"
                        value={values.name}
                        onChange={handleInputChange}
                        maxLength={150}
                        disabled={submitting}
                        aria-invalid={fieldErrors.name ? true : undefined}
                        aria-describedby={getFieldDescribedBy('name')}
                        autoComplete="off"
                    />
                </RaceField>

                <RaceField
                    id="race-type"
                    name="raceType"
                    label="Race type"
                    error={fieldErrors.raceType}
                >
                    <select
                        id="race-type"
                        name="raceType"
                        value={values.raceType}
                        onChange={handleInputChange}
                        disabled={submitting}
                        aria-invalid={fieldErrors.raceType ? true : undefined}
                        aria-describedby={getFieldDescribedBy('raceType')}
                    >
                        <option value="">Select a race type</option>
                        {raceTypes.map((raceType) => (
                            <option key={raceType} value={raceType}>
                                {formatRaceType(raceType)}
                            </option>
                        ))}
                    </select>
                </RaceField>

                <RaceField
                    id="race-scheduled-at"
                    name="scheduledAt"
                    label="Scheduled at"
                    error={fieldErrors.scheduledAt}
                >
                    <input
                        id="race-scheduled-at"
                        name="scheduledAt"
                        type="datetime-local"
                        lang="es-CO"
                        value={values.scheduledAt}
                        onChange={handleInputChange}
                        disabled={submitting}
                        aria-invalid={fieldErrors.scheduledAt ? true : undefined}
                        aria-describedby={getFieldDescribedBy('scheduledAt')}
                    />
                </RaceField>

                <RaceField
                    id="race-registration-deadline"
                    name="registrationDeadline"
                    label="Registration deadline"
                    error={fieldErrors.registrationDeadline}
                >
                    <input
                        id="race-registration-deadline"
                        name="registrationDeadline"
                        type="datetime-local"
                        lang="es-CO"
                        value={values.registrationDeadline}
                        onChange={handleInputChange}
                        disabled={submitting}
                        aria-invalid={
                            fieldErrors.registrationDeadline ? true : undefined
                        }
                        aria-describedby={getFieldDescribedBy(
                            'registrationDeadline',
                        )}
                    />
                </RaceField>

                <RaceField
                    id="race-start-location"
                    name="startLocation"
                    label="Start location"
                    error={fieldErrors.startLocation}
                >
                    <input
                        id="race-start-location"
                        name="startLocation"
                        type="text"
                        value={values.startLocation}
                        onChange={handleInputChange}
                        maxLength={200}
                        disabled={submitting}
                        aria-invalid={fieldErrors.startLocation ? true : undefined}
                        aria-describedby={getFieldDescribedBy('startLocation')}
                        autoComplete="off"
                    />
                </RaceField>

                <RaceField
                    id="race-finish-location"
                    name="finishLocation"
                    label="Finish location"
                    error={fieldErrors.finishLocation}
                >
                    <input
                        id="race-finish-location"
                        name="finishLocation"
                        type="text"
                        value={values.finishLocation}
                        onChange={handleInputChange}
                        maxLength={200}
                        disabled={submitting}
                        aria-invalid={fieldErrors.finishLocation ? true : undefined}
                        aria-describedby={getFieldDescribedBy('finishLocation')}
                        autoComplete="off"
                    />
                </RaceField>

                <RaceField
                    id="race-distance-meters"
                    name="distanceMeters"
                    label="Distance in meters"
                    error={fieldErrors.distanceMeters}
                >
                    <input
                        id="race-distance-meters"
                        name="distanceMeters"
                        type="number"
                        value={values.distanceMeters}
                        onChange={handleInputChange}
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        disabled={submitting}
                        aria-invalid={fieldErrors.distanceMeters ? true : undefined}
                        aria-describedby={getFieldDescribedBy('distanceMeters')}
                    />
                </RaceField>

                <RaceField
                    id="race-max-participants"
                    name="maxParticipants"
                    label="Maximum participants"
                    error={fieldErrors.maxParticipants}
                    hint="A race requires at least two participants."
                >
                    <input
                        id="race-max-participants"
                        name="maxParticipants"
                        type="number"
                        value={values.maxParticipants}
                        onChange={handleInputChange}
                        min="2"
                        step="1"
                        inputMode="numeric"
                        disabled={submitting}
                        aria-invalid={fieldErrors.maxParticipants ? true : undefined}
                        aria-describedby={getFieldDescribedBy(
                            'maxParticipants',
                            true,
                        )}
                    />
                </RaceField>

                <RaceField
                    id="race-description"
                    name="description"
                    label="Description"
                    error={fieldErrors.description}
                >
                    <textarea
                        id="race-description"
                        name="description"
                        value={values.description}
                        onChange={handleInputChange}
                        maxLength={1000}
                        rows={6}
                        disabled={submitting}
                        aria-invalid={fieldErrors.description ? true : undefined}
                        aria-describedby={getFieldDescribedBy('description')}
                    />
                </RaceField>
            </div>

            <div className="race-form-actions">
                <button type="submit" disabled={submitting}>
                    {submitting ? submittingLabel : submitLabel}
                </button>
                <button
                    type="button"
                    className="race-secondary-button"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}