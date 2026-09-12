interface EmptyStateProps {
    title: string
    message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
    return (
        <section className="state-card">
            <h2>{title}</h2>
            <p>{message}</p>
        </section>
    )
}