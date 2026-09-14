import {
    type ChangeEvent,
    type KeyboardEvent,
    useEffect,
    useRef,
} from 'react'

interface RegistrationActionDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel?: string
    submitting: boolean
    error: string | null
    startingPosition?: string
    startingPositionError?: string
    availableStartingPositions?: number[]
    onStartingPositionChange?: (value: string) => void
    onConfirm: () => void
    onCancel: () => void
}

export function RegistrationActionDialog({
    isOpen,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Keep registration',
    submitting,
    error,
    startingPosition,
    startingPositionError,
    availableStartingPositions = [],
    onStartingPositionChange,
    onConfirm,
    onCancel,
}: RegistrationActionDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
    const startingPositionRef = useRef<HTMLSelectElement | null>(null)
    const requiresStartingPosition =
        onStartingPositionChange !== undefined &&
        startingPosition !== undefined

    useEffect(() => {
        if (!isOpen) {
            return
        }

        if (requiresStartingPosition) {
            startingPositionRef.current?.focus()
            return
        }

        confirmButtonRef.current?.focus()
    }, [isOpen, requiresStartingPosition])

    if (!isOpen) {
        return null
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && !submitting) {
            event.preventDefault()
            onCancel()
        }
    }

    function handleStartingPositionChange(
        event: ChangeEvent<HTMLSelectElement>,
    ) {
        onStartingPositionChange?.(event.target.value)
    }

    const startingPositionDescribedBy = startingPositionError
        ? 'registration-starting-position-error'
        : undefined

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
                className="registration-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="registration-action-dialog-title"
                aria-describedby="registration-action-dialog-description"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <h2 id="registration-action-dialog-title">{title}</h2>
                <p id="registration-action-dialog-description">
                    {description}
                </p>

                {requiresStartingPosition ? (
                    <div className="registration-form-field">
                        <label htmlFor="registration-approval-starting-position">
                            Starting position
                        </label>
                        <select
                            ref={startingPositionRef}
                            id="registration-approval-starting-position"
                            value={startingPosition}
                            onChange={handleStartingPositionChange}
                            disabled={submitting}
                            aria-invalid={
                                startingPositionError ? true : undefined
                            }
                            aria-describedby={startingPositionDescribedBy}
                        >
                            <option value="">Select a starting position</option>
                            {availableStartingPositions.map((position) => (
                                <option key={position} value={position}>
                                    {position}
                                </option>
                            ))}
                        </select>
                        <span className="registration-field-hint">
                            Only positions not assigned to approved participants are available.
                        </span>
                        {startingPositionError ? (
                            <span
                                id="registration-starting-position-error"
                                className="registration-field-error"
                            >
                                {startingPositionError}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                {error ? (
                    <div
                        className="registration-dialog-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null}

                <div className="registration-dialog-actions">
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting ? 'Saving...' : confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="registration-secondary-button"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}