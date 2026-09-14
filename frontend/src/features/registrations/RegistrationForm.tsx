import {
    type ChangeEvent,
    type FormEvent,
    type RefObject,
    useEffect,
    useRef,
} from 'react'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { TeamResponse } from '../teams/teamTypes'
import type {
    RegistrationFormErrors,
    RegistrationFormValues,
    RegistrationParticipantMode,
} from './registrationTypes'

interface RegistrationFormProps {
    values: RegistrationFormValues
    fieldErrors: RegistrationFormErrors
    formError: string | null
    submitting: boolean
    raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED'
    competitors: CompetitorResponse[]
    teams: TeamResponse[]
    onValuesChange: (values: RegistrationFormValues) => void
    onSubmit: () => void
    onCancel: () => void
    participantSelectRef?: RefObject<HTMLSelectElement | null>
}

function supportsIndividualRegistrations(
    raceType: RegistrationFormProps['raceType'],
): boolean {
    return raceType === 'INDIVIDUAL' || raceType === 'MIXED'
}

function supportsTeamRegistrations(
    raceType: RegistrationFormProps['raceType'],
): boolean {
    return raceType === 'TEAM' || raceType === 'MIXED'
}

export function RegistrationForm({
    values,
    fieldErrors,
    formError,
    submitting,
    raceType,
    competitors,
    teams,
    onValuesChange,
    onSubmit,
    onCancel,
    participantSelectRef,
}: RegistrationFormProps) {
    const formErrorRef = useRef<HTMLDivElement | null>(null)
    const hasFieldErrors = Object.keys(fieldErrors).length > 0
    const canSelectIndividual = supportsIndividualRegistrations(raceType)
    const canSelectTeam = supportsTeamRegistrations(raceType)
    const selectedMode: RegistrationParticipantMode =
        raceType === 'TEAM'
            ? 'TEAM'
            : raceType === 'INDIVIDUAL'
                ? 'INDIVIDUAL'
                : values.participantMode

    useEffect(() => {
        if (formError || hasFieldErrors) {
            formErrorRef.current?.focus()
        }
    }, [formError, hasFieldErrors])

    function handleParticipantModeChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const participantMode = event.target.value as RegistrationParticipantMode

        onValuesChange({
            ...values,
            participantMode,
            competitorId: participantMode === 'INDIVIDUAL' ? values.competitorId : '',
            teamId: participantMode === 'TEAM' ? values.teamId : '',
        })
    }

    function handleCompetitorChange(event: ChangeEvent<HTMLSelectElement>) {
        onValuesChange({
            ...values,
            participantMode: 'INDIVIDUAL',
            competitorId: event.target.value,
            teamId: '',
        })
    }

    function handleTeamChange(event: ChangeEvent<HTMLSelectElement>) {
        onValuesChange({
            ...values,
            participantMode: 'TEAM',
            competitorId: '',
            teamId: event.target.value,
        })
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (submitting) {
            return
        }

        onSubmit()
    }

    function getFieldDescribedBy(
        name: 'competitorId' | 'teamId',
    ): string | undefined {
        if (!fieldErrors[name]) {
            return undefined
        }

        return `registration-field-error-${name}`
    }

    return (
        <form className="registration-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
                <div
                    ref={formErrorRef}
                    className="registration-form-error"
                    role="alert"
                    tabIndex={-1}
                >
                    <h2>Review registration information</h2>
                    <p>{formError}</p>
                </div>
            ) : null}

            <div className="registration-form-grid">
                {canSelectIndividual && canSelectTeam ? (
                    <fieldset className="registration-participant-mode">
                        <legend>Participant type</legend>
                        <label className="registration-radio-label">
                            <input
                                type="radio"
                                name="participantMode"
                                value="INDIVIDUAL"
                                checked={selectedMode === 'INDIVIDUAL'}
                                onChange={handleParticipantModeChange}
                                disabled={submitting}
                            />
                            Individual competitor
                        </label>
                        <label className="registration-radio-label">
                            <input
                                type="radio"
                                name="participantMode"
                                value="TEAM"
                                checked={selectedMode === 'TEAM'}
                                onChange={handleParticipantModeChange}
                                disabled={submitting}
                            />
                            Team
                        </label>
                    </fieldset>
                ) : null}

                {canSelectIndividual && selectedMode === 'INDIVIDUAL' ? (
                    <div className="registration-form-field">
                        <label htmlFor="registration-competitor">
                            Competitor
                        </label>
                        <select
                            ref={participantSelectRef}
                            id="registration-competitor"
                            name="competitorId"
                            value={values.competitorId}
                            onChange={handleCompetitorChange}
                            disabled={submitting}
                            aria-invalid={
                                fieldErrors.competitorId ? true : undefined
                            }
                            aria-describedby={getFieldDescribedBy('competitorId')}
                        >
                            <option value="">Select an active competitor</option>
                            {competitors.map((competitor) => (
                                <option key={competitor.id} value={competitor.id}>
                                    {competitor.name} ({competitor.nickname})
                                </option>
                            ))}
                        </select>
                        {fieldErrors.competitorId ? (
                            <span
                                id="registration-field-error-competitorId"
                                className="registration-field-error"
                            >
                                {fieldErrors.competitorId}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                {canSelectTeam && selectedMode === 'TEAM' ? (
                    <div className="registration-form-field">
                        <label htmlFor="registration-team">Team</label>
                        <select
                            ref={participantSelectRef}
                            id="registration-team"
                            name="teamId"
                            value={values.teamId}
                            onChange={handleTeamChange}
                            disabled={submitting}
                            aria-invalid={fieldErrors.teamId ? true : undefined}
                            aria-describedby={getFieldDescribedBy('teamId')}
                        >
                            <option value="">Select an eligible active team</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.teamId ? (
                            <span
                                id="registration-field-error-teamId"
                                className="registration-field-error"
                            >
                                {fieldErrors.teamId}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <p className="registration-field-hint">
                Starting position is selected when the registration is approved.
            </p>

            <div className="registration-form-actions">
                <button type="submit" disabled={submitting}>
                    {submitting
                        ? 'Registering participant...'
                        : 'Register participant'}
                </button>
                <button
                    type="button"
                    className="registration-secondary-button"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}