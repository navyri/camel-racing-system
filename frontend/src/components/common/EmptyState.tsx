interface EmptyStateProps {
    title: string
    message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
    return (
        <section className="state-card notice-panel notice-empty">
            <h2>{title}</h2>
            <p>{message}</p>
        </section>
    )
}