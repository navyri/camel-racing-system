interface LoadingStateProps {
    message?: string
}

export function LoadingState({
    message = 'Loading...',
}: LoadingStateProps) {
    return (
        <div className="state-message notice-panel notice-loading" role="status">
            {message}
        </div>
    )
}