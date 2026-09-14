import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
    return (
        <section className="status-page">
            <section className="state-card state-card-error access-denied-card">
                <h1>Access denied</h1>
                <p>You do not have the required role to view this page.</p>
                <img
                    className="access-denied-illustration"
                    src="/images/copper-golem-mc.gif"
                    alt=""
                    aria-hidden="true"
                />
                <Link to="/">Return to home</Link>
            </section>
        </section>
    )
}