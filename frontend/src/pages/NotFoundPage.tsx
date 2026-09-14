import { Link } from 'react-router-dom'

export function NotFoundPage() {
    return (
        <section className="page-panel route-status-page">
            <div className="page-heading">
                <p className="eyebrow">Route missing</p>
                <h1>Page not found</h1>
                <p>
                    The page you requested does not exist or may have moved.
                </p>
            </div>

            <section className="state-card not-found-card">
                <img
                    className="not-found-illustration"
                    src="/images/camello-mc.gif"
                    alt=""
                    aria-hidden="true"
                />
                <h2>The caravan could not find this route</h2>
                <p>
                    Return to the racing registry and choose another destination.
                </p>
                <Link
                    className="race-action-link"
                    to="/"
                >
                    Return to home
                </Link>
            </section>
        </section>
    )
}