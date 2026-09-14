import { useContext } from 'react'
import {
    NavLink,
    Navigate,
    Outlet,
} from 'react-router-dom'

import { AuthContext } from '../../auth/AuthContext'
import { UserSessionPanel } from './UserSessionPanel'

function getNavLinkClassName({
    isActive,
}: {
    isActive: boolean
}): string {
    return isActive ? 'active' : ''
}

export function AppLayout() {
    const auth = useContext(AuthContext)

    if (!auth?.initialized) {
        return (
            <main className="status-page">
                <section className="state-card">
                    <p className="eyebrow">Session check</p>
                    <h1>Preparing access</h1>
                    <p>
                        Confirming your racing registry session.
                    </p>
                </section>
            </main>
        )
    }

    if (!auth.authenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }

    const canViewAdministration =
        auth.hasRole('ADMINISTRATOR')

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="app-brand">
                    <NavLink
                        className="brand"
                        to="/"
                    >
                        Camel Racing System
                    </NavLink>
                </div>

                <nav aria-label="Main navigation">
                    <NavLink
                        className={getNavLinkClassName}
                        to="/"
                        end
                    >
                        Home
                    </NavLink>

                    <NavLink
                        className={getNavLinkClassName}
                        to="/competitors"
                    >
                        Competitors
                    </NavLink>

                    <NavLink
                        className={getNavLinkClassName}
                        to="/teams"
                    >
                        Teams
                    </NavLink>

                    <NavLink
                        className={getNavLinkClassName}
                        to="/races"
                    >
                        Races
                    </NavLink>

                    <NavLink
                        className={getNavLinkClassName}
                        to="/registrations"
                    >
                        Registrations
                    </NavLink>

                    {canViewAdministration ? (
                        <NavLink
                            className={getNavLinkClassName}
                            to="/administration"
                        >
                            Administration
                        </NavLink>
                    ) : null}
                </nav>

                <UserSessionPanel />
            </header>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    )
}