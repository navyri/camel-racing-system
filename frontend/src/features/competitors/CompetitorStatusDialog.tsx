import { useEffect, useRef } from 'react'

interface CompetitorStatusDialogProps {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    submitting: boolean
    error: string | null
    onCancel: () => void
    onConfirm: () => void
}

export function CompetitorStatusDialog({
    open,
    title,
    description,
    confirmLabel,
    submitting,
    error,
    onCancel,
    onConfirm,
}: CompetitorStatusDialogProps) {
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
        <div className="competitor-dialog-backdrop">
            <section
                className="competitor-status-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="competitor-status-dialog-title"
                aria-describedby="competitor-status-dialog-description"
            >
                <p className="competitor-kicker">Confirm competitor action</p>
                <h2 id="competitor-status-dialog-title">{title}</h2>
                <p id="competitor-status-dialog-description">{description}</p>

                {error ? (
                    <div className="competitor-dialog-error" role="alert">
                        <p>{error}</p>
                    </div>
                ) : null}

                {submitting ? (
                    <p className="competitor-dialog-progress" role="status">
                        Updating competitor...
                    </p>
                ) : null}

                <div className="competitor-dialog-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className="competitor-secondary-button"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Keep current status
                    </button>
                    <button
                        type="button"
                        className={
                            confirmLabel === 'Retire competitor'
                                ? 'competitor-danger-button'
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