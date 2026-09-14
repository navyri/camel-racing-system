import {
    type ChangeEvent,
    type FormEvent,
    type KeyboardEvent,
    useEffect,
    useRef,
    useState,
} from 'react'

const maxReasonLength = 1000

interface RegistrationRejectDialogProps {
    isOpen: boolean
    registrationLabel: string
    submitting: boolean
    error: string | null
    onConfirm: (reason: string) => void
    onCancel: () => void
}

export function RegistrationRejectDialog({
    isOpen,
    registrationLabel,
    submitting,
    error,
    onConfirm,
    onCancel,
}: RegistrationRejectDialogProps) {
    const [reason, setReason] = useState('')
    const [reasonError, setReasonError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const previousOpenRef = useRef(false)

    useEffect(() => {
        const justOpened = isOpen && !previousOpenRef.current

        previousOpenRef.current = isOpen

        if (justOpened) {
            textareaRef.current?.focus()
        }
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    function handleReasonChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setReason(event.target.value)

        if (reasonError) {
            setReasonError(null)
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (submitting) {
            return
        }

        const normalizedReason = reason.trim()

        if (normalizedReason.length === 0) {
            setReasonError('A rejection reason is required.')
            textareaRef.current?.focus()
            return
        }

        if (normalizedReason.length > maxReasonLength) {
            setReasonError(
                `The rejection reason cannot exceed ${maxReasonLength} characters.`,
            )
            textareaRef.current?.focus()
            return
        }

        onConfirm(normalizedReason)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && !submitting) {
            event.preventDefault()
            onCancel()
        }
    }

    function handleCancel() {
        if (submitting) {
            return
        }

        setReason('')
        setReasonError(null)
        onCancel()
    }

    return (
        <div
            className="registration-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    handleCancel()
                }
            }}
        >
            <div
                className="registration-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="registration-reject-dialog-title"
                aria-describedby="registration-reject-dialog-description"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <h2 id="registration-reject-dialog-title">
                    Reject registration
                </h2>
                <p id="registration-reject-dialog-description">
                    Provide a reason for rejecting {registrationLabel}.
                </p>

                {error ? (
                    <div
                        className="registration-dialog-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="registration-form-field">
                        <label htmlFor="registration-rejection-reason">
                            Rejection reason
                        </label>
                        <textarea
                            ref={textareaRef}
                            id="registration-rejection-reason"
                            value={reason}
                            onChange={handleReasonChange}
                            disabled={submitting}
                            maxLength={maxReasonLength}
                            rows={5}
                            aria-invalid={reasonError ? true : undefined}
                            aria-describedby={
                                reasonError
                                    ? 'registration-rejection-reason-error'
                                    : 'registration-rejection-reason-hint'
                            }
                        />
                        <span
                            id="registration-rejection-reason-hint"
                            className="registration-field-hint"
                        >
                            Explain why this registration cannot be accepted.
                        </span>
                        {reasonError ? (
                            <span
                                id="registration-rejection-reason-error"
                                className="registration-field-error"
                            >
                                {reasonError}
                            </span>
                        ) : null}
                    </div>

                    <div className="registration-dialog-actions">
                        <button type="submit" disabled={submitting}>
                            {submitting
                                ? 'Rejecting registration...'
                                : 'Reject registration'}
                        </button>
                        <button
                            type="button"
                            className="registration-secondary-button"
                            onClick={handleCancel}
                            disabled={submitting}
                        >
                            Keep pending
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}