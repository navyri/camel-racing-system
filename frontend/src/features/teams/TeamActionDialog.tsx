import {
    useEffect,
    useRef,
    type KeyboardEvent,
} from 'react'

interface TeamActionDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel: string
    isSubmitting: boolean
    errorMessage: string | null
    danger?: boolean
    onClose: () => void
    onConfirm: () => Promise<void> | void
}

export function TeamActionDialog({
    isOpen,
    title,
    description,
    confirmLabel,
    isSubmitting,
    errorMessage,
    danger = false,
    onClose,
    onConfirm,
}: TeamActionDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        window.setTimeout(() => {
            confirmButtonRef.current?.focus()
        }, 0)
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    function handleBackdropClick() {
        if (!isSubmitting) {
            onClose()
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && !isSubmitting) {
            event.preventDefault()
            onClose()
        }
    }

    return (
        <div
            className="team-dialog-backdrop"
            role="presentation"
            onMouseDown={handleBackdropClick}
        >
            <section
                className="team-action-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-action-dialog-title"
                aria-describedby="team-action-dialog-description"
                onKeyDown={handleKeyDown}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2 id="team-action-dialog-title">{title}</h2>

                <p id="team-action-dialog-description">
                    {description}
                </p>

                {errorMessage ? (
                    <section
                        className="team-dialog-error"
                        role="alert"
                    >
                        {errorMessage}
                    </section>
                ) : null}

                <div className="team-dialog-actions">
                    <button
                        ref={confirmButtonRef}
                        className={
                            danger
                                ? 'team-danger-button'
                                : undefined
                        }
                        type="button"
                        onClick={() => {
                            void onConfirm()
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? 'Processing...'
                            : confirmLabel}
                    </button>

                    <button
                        className="team-secondary-button"
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            </section>
        </div>
    )
}