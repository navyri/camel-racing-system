import {
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
    useEffect,
    useRef,
} from 'react'
import {
    competitorTypes,
    type AgeReferenceType,
    type CompetitorFormErrors,
    type CompetitorFormValues,
    type CompetitorType,
} from './competitorTypes'

interface CompetitorFormProps {
    values: CompetitorFormValues
    fieldErrors: CompetitorFormErrors
    formError: string | null
    submitting: boolean
    submitLabel: string
    submittingLabel: string
    onValuesChange: (values: CompetitorFormValues) => void
    onAgeReferenceTypeChange: (ageReferenceType: AgeReferenceType) => void
    onSubmit: () => void
    onCancel: () => void
}

interface CompetitorFieldProps {
    id: string
    name: keyof CompetitorFormValues
    label: string
    error?: string
    hint?: string
    children: ReactNode
}

function CompetitorField({
    id,
    name,
    label,
    error,
    hint,
    children,
}: CompetitorFieldProps) {
    const errorId = error ? `competitor-field-error-${name}` : undefined
    const hintId = hint ? `competitor-field-hint-${name}` : undefined

    return (
        <div className="competitor-form-field">
            <label htmlFor={id}>{label}</label>
            {children}
            {hint ? (
                <span id={hintId} className="competitor-field-hint">
                    {hint}
                </span>
            ) : null}
            {error ? (
                <span id={errorId} className="competitor-field-error">
                    {error}
                </span>
            ) : null}
        </div>
    )
}

function formatCompetitorType(value: CompetitorType): string {
    return value.charAt(0) + value.slice(1).toLowerCase()
}

export function CompetitorForm({
    values,
    fieldErrors,
    formError,
    submitting,
    submitLabel,
    submittingLabel,
    onValuesChange,
    onAgeReferenceTypeChange,
    onSubmit,
    onCancel,
}: CompetitorFormProps) {
    const formErrorRef = useRef<HTMLDivElement | null>(null)
    const hasFieldErrors = Object.keys(fieldErrors).length > 0

    useEffect(() => {
        if (formError || hasFieldErrors) {
            formErrorRef.current?.focus()
        }
    }, [formError, hasFieldErrors])

    function updateValue(name: keyof CompetitorFormValues, value: string) {
        onValuesChange({
            ...values,
            [name]: value,
        })
    }

    function handleInputChange(
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) {
        updateValue(
            event.target.name as keyof CompetitorFormValues,
            event.target.value,
        )
    }

    function handleAgeReferenceChange(event: ChangeEvent<HTMLInputElement>) {
        onAgeReferenceTypeChange(event.target.value as AgeReferenceType)
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (submitting) {
            return
        }

        onSubmit()
    }

    function getFieldDescribedBy(
        name: keyof CompetitorFormValues,
        hasHint = false,
    ): string | undefined {
        const describedBy = []

        if (hasHint) {
            describedBy.push(`competitor-field-hint-${name}`)
        }

        if (fieldErrors[name]) {
            describedBy.push(`competitor-field-error-${name}`)
        }

        return describedBy.length > 0 ? describedBy.join(' ') : undefined
    }

    const ageReferenceError =
        fieldErrors.dateOfBirth ??
        fieldErrors.approximateAge ??
        fieldErrors.ageReference

    return (
        <form className="competitor-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
                <div
                    ref={formErrorRef}
                    className="competitor-form-error"
                    role="alert"
                    tabIndex={-1}
                >
                    <h2>Review competitor information</h2>
                    <p>{formError}</p>
                </div>
            ) : null}

            <div className="competitor-form-grid">
                <CompetitorField
                    id="competitor-name"
                    name="name"
                    label="Name"
                    error={fieldErrors.name}
                >
                    <input
                        id="competitor-name"
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
                </CompetitorField>

                <CompetitorField
                    id="competitor-nickname"
                    name="nickname"
                    label="Nickname"
                    error={fieldErrors.nickname}
                    hint="Nicknames must be unique, including uppercase and lowercase variations."
                >
                    <input
                        id="competitor-nickname"
                        name="nickname"
                        type="text"
                        value={values.nickname}
                        onChange={handleInputChange}
                        maxLength={100}
                        disabled={submitting}
                        aria-invalid={fieldErrors.nickname ? true : undefined}
                        aria-describedby={getFieldDescribedBy('nickname', true)}
                        autoComplete="off"
                    />
                </CompetitorField>

                <CompetitorField
                    id="competitor-type"
                    name="competitorType"
                    label="Competitor type"
                    error={fieldErrors.competitorType}
                >
                    <select
                        id="competitor-type"
                        name="competitorType"
                        value={values.competitorType}
                        onChange={handleInputChange}
                        disabled={submitting}
                        aria-invalid={fieldErrors.competitorType ? true : undefined}
                        aria-describedby={getFieldDescribedBy('competitorType')}
                    >
                        <option value="">Select a competitor type</option>
                        {competitorTypes.map((competitorType) => (
                            <option key={competitorType} value={competitorType}>
                                {formatCompetitorType(competitorType)}
                            </option>
                        ))}
                    </select>
                </CompetitorField>

                <CompetitorField
                    id="competitor-origin"
                    name="origin"
                    label="Origin"
                    error={fieldErrors.origin}
                >
                    <input
                        id="competitor-origin"
                        name="origin"
                        type="text"
                        value={values.origin}
                        onChange={handleInputChange}
                        maxLength={100}
                        disabled={submitting}
                        aria-invalid={fieldErrors.origin ? true : undefined}
                        aria-describedby={getFieldDescribedBy('origin')}
                        autoComplete="off"
                    />
                </CompetitorField>

                <fieldset
                    className="competitor-age-reference"
                    disabled={submitting}
                    aria-describedby={
                        ageReferenceError
                            ? 'competitor-age-reference-error'
                            : undefined
                    }
                >
                    <legend>Age reference</legend>
                    <p className="competitor-field-hint">
                        Provide either a date of birth or an approximate age, but not both.
                    </p>

                    <label className="competitor-radio-label">
                        <input
                            type="radio"
                            name="ageReferenceType"
                            value="dateOfBirth"
                            checked={values.ageReferenceType === 'dateOfBirth'}
                            onChange={handleAgeReferenceChange}
                        />
                        Use date of birth
                    </label>

                    <label className="competitor-radio-label">
                        <input
                            type="radio"
                            name="ageReferenceType"
                            value="approximateAge"
                            checked={values.ageReferenceType === 'approximateAge'}
                            onChange={handleAgeReferenceChange}
                        />
                        Use approximate age
                    </label>

                    {ageReferenceError ? (
                        <span
                            id="competitor-age-reference-error"
                            className="competitor-field-error"
                            role="alert"
                        >
                            {ageReferenceError}
                        </span>
                    ) : null}

                    <div className="competitor-age-controls">
                        <CompetitorField
                            id="competitor-date-of-birth"
                            name="dateOfBirth"
                            label="Date of birth"
                            error={
                                values.ageReferenceType === 'dateOfBirth'
                                    ? fieldErrors.dateOfBirth
                                    : undefined
                            }
                        >
                            <input
                                id="competitor-date-of-birth"
                                name="dateOfBirth"
                                type="date"
                                lang="es-CO"
                                value={values.dateOfBirth}
                                onChange={handleInputChange}
                                disabled={
                                    submitting ||
                                    values.ageReferenceType !== 'dateOfBirth'
                                }
                                aria-invalid={
                                    values.ageReferenceType === 'dateOfBirth' &&
                                        fieldErrors.dateOfBirth
                                        ? true
                                        : undefined
                                }
                                aria-describedby={getFieldDescribedBy('dateOfBirth')}
                            />
                        </CompetitorField>

                        <CompetitorField
                            id="competitor-approximate-age"
                            name="approximateAge"
                            label="Approximate age"
                            error={
                                values.ageReferenceType === 'approximateAge'
                                    ? fieldErrors.approximateAge
                                    : undefined
                            }
                        >
                            <input
                                id="competitor-approximate-age"
                                name="approximateAge"
                                type="number"
                                value={values.approximateAge}
                                onChange={handleInputChange}
                                min="1"
                                step="1"
                                inputMode="numeric"
                                disabled={
                                    submitting ||
                                    values.ageReferenceType !== 'approximateAge'
                                }
                                aria-invalid={
                                    values.ageReferenceType === 'approximateAge' &&
                                        fieldErrors.approximateAge
                                        ? true
                                        : undefined
                                }
                                aria-describedby={getFieldDescribedBy(
                                    'approximateAge',
                                )}
                            />
                        </CompetitorField>
                    </div>
                </fieldset>

                <CompetitorField
                    id="competitor-weight-kg"
                    name="weightKg"
                    label="Weight in kg"
                    error={fieldErrors.weightKg}
                >
                    <input
                        id="competitor-weight-kg"
                        name="weightKg"
                        type="number"
                        value={values.weightKg}
                        onChange={handleInputChange}
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        disabled={submitting}
                        aria-invalid={fieldErrors.weightKg ? true : undefined}
                        aria-describedby={getFieldDescribedBy('weightKg')}
                    />
                </CompetitorField>

                <CompetitorField
                    id="competitor-height-cm"
                    name="heightCm"
                    label="Height in cm"
                    error={fieldErrors.heightCm}
                >
                    <input
                        id="competitor-height-cm"
                        name="heightCm"
                        type="number"
                        value={values.heightCm}
                        onChange={handleInputChange}
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        disabled={submitting}
                        aria-invalid={fieldErrors.heightCm ? true : undefined}
                        aria-describedby={getFieldDescribedBy('heightCm')}
                    />
                </CompetitorField>
            </div>

            <div className="competitor-form-actions">
                <button type="submit" disabled={submitting}>
                    {submitting ? submittingLabel : submitLabel}
                </button>
                <button
                    type="button"
                    className="competitor-secondary-button"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}