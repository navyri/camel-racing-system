import {
    type KeyboardEvent,
    useEffect,
    useRef,
} from 'react'

interface RegistrationFeedbackDialogProps {
    isOpen: boolean
    title: string
    message: string
    onClose: () => void
}

export function RegistrationFeedbackDialog({
    isOpen,
    title,
    message,
    onClose,
}: RegistrationFeedbackDialogProps) {
    const closeButtonRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        closeButtonRef.current?.focus()
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
        }
    }

    return (
        <div
            className="registration-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="registration-dialog registration-feedback-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="registration-feedback-dialog-title"
                aria-describedby="registration-feedback-dialog-description"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <p className="race-kicker">Registration update</p>
                <h2 id="registration-feedback-dialog-title">{title}</h2>
                <p id="registration-feedback-dialog-description">{message}</p>

                <div className="registration-dialog-actions">
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}