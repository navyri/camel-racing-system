import {
    type KeyboardEvent,
    useEffect,
    useRef,
} from 'react'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { TeamResponse } from '../teams/teamTypes'
import { RegistrationForm } from './RegistrationForm'
import type {
    RegistrationFormErrors,
    RegistrationFormValues,
} from './registrationTypes'

interface RegistrationCreateDialogProps {
    isOpen: boolean
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
}

function getDialogTitle(
    raceType: RegistrationCreateDialogProps['raceType'],
): string {
    if (raceType === 'TEAM') {
        return 'Register team participant'
    }

    if (raceType === 'MIXED') {
        return 'Register race participant'
    }

    return 'Register individual participant'
}

function getDialogDescription(
    raceType: RegistrationCreateDialogProps['raceType'],
): string {
    if (raceType === 'TEAM') {
        return 'Only eligible active teams can be registered in this race.'
    }

    if (raceType === 'MIXED') {
        return 'Choose an active individual competitor or an eligible active team for this race.'
    }

    return 'Only active competitors can be registered in this race.'
}

export function RegistrationCreateDialog({
    isOpen,
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
}: RegistrationCreateDialogProps) {
    const participantSelectRef = useRef<HTMLSelectElement | null>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        participantSelectRef.current?.focus()
    }, [isOpen, values.participantMode])

    if (!isOpen) {
        return null
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && !submitting) {
            event.preventDefault()
            onCancel()
        }
    }

    return (
        <div
            className="registration-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    onCancel()
                }
            }}
        >
            <div
                className="registration-dialog registration-create-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="registration-create-dialog-title"
                aria-describedby="registration-create-dialog-description"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <p className="race-kicker">Registration entry</p>
                <h2 id="registration-create-dialog-title">
                    {getDialogTitle(raceType)}
                </h2>
                <p id="registration-create-dialog-description">
                    {getDialogDescription(raceType)}
                </p>

                <RegistrationForm
                    values={values}
                    fieldErrors={fieldErrors}
                    formError={formError}
                    submitting={submitting}
                    raceType={raceType}
                    competitors={competitors}
                    teams={teams}
                    onValuesChange={onValuesChange}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                    participantSelectRef={participantSelectRef}
                />
            </div>
        </div>
    )
}