interface LoadingStateProps {
    message?: string
}

export function LoadingState({
    message = 'Loading...',
}: LoadingStateProps) {
    return (
        <div className="state-message" role="status">
            {message}
        </div>
    )
}