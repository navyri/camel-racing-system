import {
    type ChangeEvent,
    type FormEvent,
    type RefObject,
    useEffect,
    useRef,
} from 'react'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import {
    formatRegistrationParticipant,
    getResultStatusLabel,
    isFinishedResultStatus,
    resultStatuses,
    type ResultFormErrors,
    type ResultFormValues,
} from './resultTypes'

interface ResultFormProps {
    values: ResultFormValues
    fieldErrors: ResultFormErrors
    formError: string | null
    submitting: boolean
    registrations: RegistrationResponse[]
    requireRegistration: boolean
    onValuesChange: (values: ResultFormValues) => void
    onSubmit: () => void
    onCancel: () => void
    initialFocusRef?: RefObject<HTMLSelectElement | null>
}

function getFieldDescribedBy(
    fieldErrors: ResultFormErrors,
    name: keyof ResultFormValues,
): string | undefined {
    return fieldErrors[name] ? `result-field-error-${name}` : undefined
}

export function ResultForm({
    values,
    fieldErrors,
    formError,
    submitting,
    registrations,
    requireRegistration,
    onValuesChange,
    onSubmit,
    onCancel,
    initialFocusRef,
}: ResultFormProps) {
    const formErrorRef = useRef<HTMLDivElement | null>(null)
    const requiresFinishedValues = isFinishedResultStatus(values.status)
    const hasFieldErrors = Object.keys(fieldErrors).length > 0

    useEffect(() => {
        if (formError || hasFieldErrors) {
            formErrorRef.current?.focus()
        }
    }, [formError, hasFieldErrors])

    function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
        const { name, value } = event.target

        onValuesChange({
            ...values,
            [name]: value,
        })
    }

    function handleInputChange(
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) {
        const { name, value } = event.target

        onValuesChange({
            ...values,
            [name]: value,
        })
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (submitting) {
            return
        }

        onSubmit()
    }

    return (
        <form className="result-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
                <div
                    ref={formErrorRef}
                    className="result-form-error"
                    role="alert"
                    tabIndex={-1}
                >
                    <h2>Review result information</h2>
                    <p>{formError}</p>
                </div>
            ) : null}

            <div className="result-form-grid">
                {requireRegistration ? (
                    <div className="result-form-field result-form-wide-field">
                        <label htmlFor="result-registration">
                            Approved participant registration
                        </label>
                        <select
                            ref={initialFocusRef}
                            id="result-registration"
                            name="registrationId"
                            value={values.registrationId}
                            onChange={handleSelectChange}
                            disabled={submitting}
                            aria-invalid={
                                fieldErrors.registrationId ? true : undefined
                            }
                            aria-describedby={getFieldDescribedBy(
                                fieldErrors,
                                'registrationId',
                            )}
                        >
                            <option value="">
                                Select an approved participant
                            </option>
                            {registrations.map((registration) => (
                                <option
                                    key={registration.id}
                                    value={registration.id}
                                >
                                    {formatRegistrationParticipant(registration)}
                                </option>
                            ))}
                        </select>
                        <span className="result-field-hint">
                            Only approved registrations without an official result
                            can be selected.
                        </span>
                        {fieldErrors.registrationId ? (
                            <span
                                id="result-field-error-registrationId"
                                className="result-field-error"
                            >
                                {fieldErrors.registrationId}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div className="result-form-field">
                    <label htmlFor="result-status">Result status</label>
                    <select
                        ref={requireRegistration ? undefined : initialFocusRef}
                        id="result-status"
                        name="status"
                        value={values.status}
                        onChange={handleSelectChange}
                        disabled={submitting}
                    >
                        {resultStatuses.map((status) => (
                            <option key={status} value={status}>
                                {getResultStatusLabel(status)}
                            </option>
                        ))}
                    </select>
                    <span className="result-field-hint">
                        Non finished results store no final position or timing
                        values.
                    </span>
                </div>

                {requiresFinishedValues ? (
                    <>
                        <div className="result-form-field result-form-wide-field">
                            <span className="result-field-hint">
                                Final position is calculated automatically from
                                completion time, penalty time, recorded time, and
                                result identifier.
                            </span>
                        </div>

                        <div className="result-form-field">
                            <label htmlFor="result-completion-time">
                                Completion time in seconds
                            </label>
                            <input
                                id="result-completion-time"
                                name="completionTimeSeconds"
                                type="number"
                                min="1"
                                step="1"
                                value={values.completionTimeSeconds}
                                onChange={handleInputChange}
                                disabled={submitting}
                                aria-invalid={
                                    fieldErrors.completionTimeSeconds
                                        ? true
                                        : undefined
                                }
                                aria-describedby={getFieldDescribedBy(
                                    fieldErrors,
                                    'completionTimeSeconds',
                                )}
                            />
                            {fieldErrors.completionTimeSeconds ? (
                                <span
                                    id="result-field-error-completionTimeSeconds"
                                    className="result-field-error"
                                >
                                    {fieldErrors.completionTimeSeconds}
                                </span>
                            ) : null}
                        </div>

                        <div className="result-form-field">
                            <label htmlFor="result-penalty-time">
                                Penalty time in seconds
                            </label>
                            <input
                                id="result-penalty-time"
                                name="penaltyTimeSeconds"
                                type="number"
                                min="0"
                                step="1"
                                value={values.penaltyTimeSeconds}
                                onChange={handleInputChange}
                                disabled={submitting}
                                aria-invalid={
                                    fieldErrors.penaltyTimeSeconds
                                        ? true
                                        : undefined
                                }
                                aria-describedby={getFieldDescribedBy(
                                    fieldErrors,
                                    'penaltyTimeSeconds',
                                )}
                            />
                            {fieldErrors.penaltyTimeSeconds ? (
                                <span
                                    id="result-field-error-penaltyTimeSeconds"
                                    className="result-field-error"
                                >
                                    {fieldErrors.penaltyTimeSeconds}
                                </span>
                            ) : null}
                        </div>
                    </>
                ) : null}

                <div className="result-form-field result-form-wide-field">
                    <label htmlFor="result-notes">Notes</label>
                    <textarea
                        id="result-notes"
                        name="notes"
                        value={values.notes}
                        onChange={handleInputChange}
                        disabled={submitting}
                        maxLength={1000}
                        rows={4}
                        aria-invalid={fieldErrors.notes ? true : undefined}
                        aria-describedby={getFieldDescribedBy(
                            fieldErrors,
                            'notes',
                        )}
                    />
                    <span className="result-field-hint">
                        Optional. Maximum 1000 characters.
                    </span>
                    {fieldErrors.notes ? (
                        <span
                            id="result-field-error-notes"
                            className="result-field-error"
                        >
                            {fieldErrors.notes}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="result-form-actions">
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Saving result...' : 'Save result'}
                </button>
                <button
                    type="button"
                    className="result-secondary-button"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}