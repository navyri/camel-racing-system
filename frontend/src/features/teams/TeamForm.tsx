import {
    useState,
    type FormEvent,
} from 'react'

import type {
    TeamFormErrors,
    TeamFormValues,
} from './teamTypes'
import {
    createEmptyTeamFormValues,
    validateTeamForm,
} from './teamTypes'

interface TeamFormProps {
    initialValues?: TeamFormValues
    submitLabel: string
    isSubmitting: boolean
    submitError: string | null
    backendErrors?: TeamFormErrors
    onSubmit: (values: TeamFormValues) => Promise<void> | void
    onCancel: () => void
}

export function TeamForm({
    initialValues,
    submitLabel,
    isSubmitting,
    submitError,
    backendErrors,
    onSubmit,
    onCancel,
}: TeamFormProps) {
    const [values, setValues] = useState<TeamFormValues>(
        initialValues ?? createEmptyTeamFormValues(),
    )
    const [errors, setErrors] = useState<TeamFormErrors>({})

    function getFieldError(
        field: keyof TeamFormValues,
    ): string | undefined {
        return errors[field] ?? backendErrors?.[field]
    }

    function handleFieldChange(
        field: keyof TeamFormValues,
        value: string,
    ) {
        setValues((currentValues) => ({
            ...currentValues,
            [field]: value,
        }))

        setErrors((currentErrors) => {
            const nextErrors = {
                ...currentErrors,
            }

            delete nextErrors[field]

            return nextErrors
        })
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const validationErrors = validateTeamForm(values)

        setErrors(validationErrors)

        if (Object.keys(validationErrors).length > 0) {
            return
        }

        await onSubmit(values)
    }

    const nameError = getFieldError('name')
    const descriptionError = getFieldError('description')
    const coachNameError = getFieldError('coachName')

    return (
        <form
            className="team-form"
            noValidate
            onSubmit={(event) => {
                void handleSubmit(event)
            }}
        >
            {submitError ? (
                <section
                    className="team-form-error"
                    role="alert"
                >
                    <h2>Team could not be saved</h2>
                    <p>{submitError}</p>
                </section>
            ) : null}

            <div className="team-form-grid">
                <div className="team-form-field">
                    <label htmlFor="team-name">Team name</label>
                    <input
                        id="team-name"
                        name="name"
                        type="text"
                        value={values.name}
                        onChange={(event) =>
                            handleFieldChange(
                                'name',
                                event.target.value,
                            )
                        }
                        maxLength={150}
                        autoComplete="organization"
                        aria-invalid={Boolean(nameError)}
                        aria-describedby={
                            nameError
                                ? 'team-name-error'
                                : 'team-name-hint'
                        }
                        disabled={isSubmitting}
                        required
                    />
                    <span
                        id="team-name-hint"
                        className="team-field-hint"
                    >
                        Required. Maximum 150 characters.
                    </span>
                    {nameError ? (
                        <span
                            id="team-name-error"
                            className="team-field-error"
                        >
                            {nameError}
                        </span>
                    ) : null}
                </div>

                <div className="team-form-field">
                    <label htmlFor="team-coach-name">Coach name</label>
                    <input
                        id="team-coach-name"
                        name="coachName"
                        type="text"
                        value={values.coachName}
                        onChange={(event) =>
                            handleFieldChange(
                                'coachName',
                                event.target.value,
                            )
                        }
                        maxLength={150}
                        autoComplete="name"
                        aria-invalid={Boolean(coachNameError)}
                        aria-describedby={
                            coachNameError
                                ? 'team-coach-name-error'
                                : 'team-coach-name-hint'
                        }
                        disabled={isSubmitting}
                        required
                    />
                    <span
                        id="team-coach-name-hint"
                        className="team-field-hint"
                    >
                        Required. Maximum 150 characters.
                    </span>
                    {coachNameError ? (
                        <span
                            id="team-coach-name-error"
                            className="team-field-error"
                        >
                            {coachNameError}
                        </span>
                    ) : null}
                </div>

                <div className="team-form-field team-form-description-field">
                    <label htmlFor="team-description">Description</label>
                    <textarea
                        id="team-description"
                        name="description"
                        value={values.description}
                        onChange={(event) =>
                            handleFieldChange(
                                'description',
                                event.target.value,
                            )
                        }
                        maxLength={500}
                        rows={7}
                        aria-invalid={Boolean(descriptionError)}
                        aria-describedby={
                            descriptionError
                                ? 'team-description-error'
                                : 'team-description-hint'
                        }
                        disabled={isSubmitting}
                        required
                    />
                    <span
                        id="team-description-hint"
                        className="team-field-hint"
                    >
                        Required. Maximum 500 characters.
                    </span>
                    {descriptionError ? (
                        <span
                            id="team-description-error"
                            className="team-field-error"
                        >
                            {descriptionError}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="team-form-actions">
                <button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving team...' : submitLabel}
                </button>

                <button
                    className="team-secondary-button"
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}