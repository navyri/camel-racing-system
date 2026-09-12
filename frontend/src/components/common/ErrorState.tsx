interface ErrorStateProps {
    message: string
}

export function ErrorState({ message }: ErrorStateProps) {
    return (
        <section className="state-card state-card-error" role="alert">
            <h2>Something went wrong</h2>
            <p>{message}</p>
        </section>
    )
}