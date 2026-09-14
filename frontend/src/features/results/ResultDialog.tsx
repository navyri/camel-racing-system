import {
    type KeyboardEvent,
    useEffect,
    useRef,
} from 'react'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import { ResultForm } from './ResultForm'
import type {
    ResultFormErrors,
    ResultFormValues,
} from './resultTypes'

interface ResultDialogProps {
    isOpen: boolean
    title: string
    description: string
    values: ResultFormValues
    fieldErrors: ResultFormErrors
    formError: string | null
    submitting: boolean
    registrations: RegistrationResponse[]
    requireRegistration: boolean
    onValuesChange: (values: ResultFormValues) => void
    onSubmit: () => void
    onCancel: () => void
}

export function ResultDialog({
    isOpen,
    title,
    description,
    values,
    fieldErrors,
    formError,
    submitting,
    registrations,
    requireRegistration,
    onValuesChange,
    onSubmit,
    onCancel,
}: ResultDialogProps) {
    const initialFocusRef = useRef<HTMLSelectElement | null>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        initialFocusRef.current?.focus()
    }, [isOpen, values.status])

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
            className="result-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    onCancel()
                }
            }}
        >
            <div
                className="result-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="result-dialog-title"
                aria-describedby="result-dialog-description"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <p className="race-kicker">Official result</p>
                <h2 id="result-dialog-title">{title}</h2>
                <p id="result-dialog-description">{description}</p>

                <ResultForm
                    values={values}
                    fieldErrors={fieldErrors}
                    formError={formError}
                    submitting={submitting}
                    registrations={registrations}
                    requireRegistration={requireRegistration}
                    onValuesChange={onValuesChange}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                    initialFocusRef={initialFocusRef}
                />
            </div>
        </div>
    )
}