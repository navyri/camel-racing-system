import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
    return (
        <section className="state-card state-card-error">
            <h1>Access denied</h1>
            <p>You do not have the required role to view this page.</p>
            <Link to="/">Return to home</Link>
        </section>
    )
}