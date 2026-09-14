import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react'

export interface TeamMemberOption {
    id: string
    name: string
    nickname: string
    competitorType: string
}

interface TeamMemberDialogProps {
    isOpen: boolean
    isSubmitting: boolean
    errorMessage: string | null
    competitors: TeamMemberOption[]
    onClose: () => void
    onConfirm: (competitorId: string) => Promise<void> | void
}

function getCompetitorLabel(competitor: TeamMemberOption): string {
    const nickname = competitor.nickname.trim()

    if (nickname) {
        return `${competitor.name} (${nickname}) - ${competitor.competitorType}`
    }

    return `${competitor.name} - ${competitor.competitorType}`
}

export function TeamMemberDialog({
    isOpen,
    isSubmitting,
    errorMessage,
    competitors,
    onClose,
    onConfirm,
}: TeamMemberDialogProps) {
    const selectRef = useRef<HTMLSelectElement>(null)
    const [competitorId, setCompetitorId] = useState('')
    const [selectionError, setSelectionError] = useState<string | null>(
        null,
    )

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const timer = window.setTimeout(() => {
            selectRef.current?.focus()
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
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

    async function handleConfirm() {
        if (!competitorId) {
            setSelectionError('Select an active competitor first.')
            return
        }

        setSelectionError(null)
        await onConfirm(competitorId)
    }

    function handleClose() {
        if (isSubmitting) {
            return
        }

        setCompetitorId('')
        setSelectionError(null)
        onClose()
    }

    return (
        <div
            className="team-dialog-backdrop"
            role="presentation"
            onMouseDown={handleBackdropClick}
        >
            <section
                className="team-member-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-member-dialog-title"
                aria-describedby="team-member-dialog-description"
                onKeyDown={handleKeyDown}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2 id="team-member-dialog-title">
                    Add team member
                </h2>

                <p id="team-member-dialog-description">
                    Choose an active competitor who does not belong to another
                    active team.
                </p>

                {competitors.length === 0 ? (
                    <section
                        className="team-dialog-error"
                        role="alert"
                    >
                        No active competitors are available to add.
                    </section>
                ) : (
                    <div className="team-form-field">
                        <label htmlFor="team-member-competitor">
                            Active competitor
                        </label>
                        <select
                            ref={selectRef}
                            id="team-member-competitor"
                            value={competitorId}
                            onChange={(event) => {
                                setCompetitorId(event.target.value)
                                setSelectionError(null)
                            }}
                            aria-invalid={Boolean(selectionError)}
                            aria-describedby={
                                selectionError
                                    ? 'team-member-selection-error'
                                    : 'team-member-selection-hint'
                            }
                            disabled={isSubmitting}
                            required
                        >
                            <option value="">
                                Select an active competitor
                            </option>
                            {competitors.map((competitor) => (
                                <option
                                    key={competitor.id}
                                    value={competitor.id}
                                >
                                    {getCompetitorLabel(competitor)}
                                </option>
                            ))}
                        </select>

                        <span
                            id="team-member-selection-hint"
                            className="team-field-hint"
                        >
                            Only active competitors can join an active team.
                        </span>

                        {selectionError ? (
                            <span
                                id="team-member-selection-error"
                                className="team-field-error"
                            >
                                {selectionError}
                            </span>
                        ) : null}
                    </div>
                )}

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
                        type="button"
                        onClick={() => {
                            void handleConfirm()
                        }}
                        disabled={
                            isSubmitting ||
                            competitors.length === 0
                        }
                    >
                        {isSubmitting
                            ? 'Adding member...'
                            : 'Add member'}
                    </button>

                    <button
                        className="team-secondary-button"
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            </section>
        </div>
    )
}