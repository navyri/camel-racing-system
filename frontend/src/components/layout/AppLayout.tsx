import { NavLink, Outlet } from 'react-router-dom'
import { UserSessionPanel } from './UserSessionPanel'

export function AppLayout() {
    return (
        <div className="app-shell">
            <header className="app-header">
                <NavLink className="brand" to="/">
                    Camel Racing System
                </NavLink>
                <nav aria-label="Primary navigation">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/admin">Administration</NavLink>
                </nav>
                <UserSessionPanel />
            </header>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    )
}