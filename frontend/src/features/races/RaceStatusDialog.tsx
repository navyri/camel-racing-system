import { useEffect, useRef } from 'react'

interface RaceStatusDialogProps {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    submitting: boolean
    error: string | null
    onCancel: () => void
    onConfirm: () => void
}

export function RaceStatusDialog({
    open,
    title,
    description,
    confirmLabel,
    submitting,
    error,
    onCancel,
    onConfirm,
}: RaceStatusDialogProps) {
    const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        if (!open) {
            return
        }

        cancelButtonRef.current?.focus()

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !submitting) {
                event.preventDefault()
                onCancel()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [onCancel, open, submitting])

    if (!open) {
        return null
    }

    return (
        <div className="race-dialog-backdrop">
            <section
                className="race-status-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="race-status-dialog-title"
                aria-describedby="race-status-dialog-description"
            >
                <p className="race-kicker">Confirm race action</p>
                <h2 id="race-status-dialog-title">{title}</h2>
                <p id="race-status-dialog-description">{description}</p>

                {error ? (
                    <div className="race-dialog-error" role="alert">
                        <p>{error}</p>
                    </div>
                ) : null}

                {submitting ? (
                    <p className="race-dialog-progress" role="status">
                        Updating race...
                    </p>
                ) : null}

                <div className="race-dialog-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className="race-secondary-button"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Keep current state
                    </button>
                    <button
                        type="button"
                        className={
                            confirmLabel === 'Cancel race'
                                ? 'race-danger-button'
                                : undefined
                        }
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    )
}