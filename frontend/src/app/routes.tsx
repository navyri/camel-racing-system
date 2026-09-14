import { Link, Route, Routes } from 'react-router-dom'

import { RoleGuard } from '../auth/RoleGuard'
import { AppLayout } from '../components/layout/AppLayout'
import { CompetitorDetailPage } from '../features/competitors/CompetitorDetailPage'
import { CompetitorFormPage } from '../features/competitors/CompetitorFormPage'
import { CompetitorListPage } from '../features/competitors/CompetitorListPage'
import { RaceDetailPage } from '../features/races/RaceDetailPage'
import { RaceFormPage } from '../features/races/RaceFormPage'
import { RaceListPage } from '../features/races/RaceListPage'
import { RaceRegistrationsPage } from '../features/registrations/RaceRegistrationsPage'
import { RegistrationsLandingPage } from '../features/registrations/RegistrationsLandingPage'
import { RaceResultsPage } from '../features/results/RaceResultsPage'
import { TeamDetailPage } from '../features/teams/TeamDetailPage'
import { TeamFormPage } from '../features/teams/TeamFormPage'
import { TeamListPage } from '../features/teams/TeamListPage'
import { AdminPage } from '../pages/AdminPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route element={<AppLayout />}>
                <Route
                    path="/"
                    element={<HomePage />}
                />

                <Route
                    path="/competitors"
                    element={<CompetitorListPage />}
                />

                <Route
                    path="/competitors/new"
                    element={
                        <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                            <CompetitorFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/competitors/:competitorId"
                    element={<CompetitorDetailPage />}
                />

                <Route
                    path="/competitors/:competitorId/edit"
                    element={
                        <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                            <CompetitorFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/teams"
                    element={<TeamListPage />}
                />

                <Route
                    path="/teams/new"
                    element={
                        <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                            <TeamFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/teams/:teamId"
                    element={<TeamDetailPage />}
                />

                <Route
                    path="/teams/:teamId/edit"
                    element={
                        <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                            <TeamFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/races"
                    element={<RaceListPage />}
                />

                <Route
                    path="/races/new"
                    element={
                        <RoleGuard
                            allowedRoles={[
                                'ADMINISTRATOR',
                                'RACE_ORGANIZER',
                            ]}
                        >
                            <RaceFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/races/:raceId"
                    element={<RaceDetailPage />}
                />

                <Route
                    path="/races/:raceId/edit"
                    element={
                        <RoleGuard
                            allowedRoles={[
                                'ADMINISTRATOR',
                                'RACE_ORGANIZER',
                            ]}
                        >
                            <RaceFormPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/races/:raceId/registrations"
                    element={<RaceRegistrationsPage />}
                />

                <Route
                    path="/races/:raceId/results"
                    element={<RaceResultsPage />}
                />

                <Route
                    path="/registrations"
                    element={<RegistrationsLandingPage />}
                />

                <Route
                    path="/administration"
                    element={
                        <RoleGuard allowedRoles={['ADMINISTRATOR']}>
                            <AdminPage />
                        </RoleGuard>
                    }
                />

                <Route
                    path="/forbidden"
                    element={
                        <section className="page-panel route-status-page">
                            <div className="page-heading">
                                <p className="eyebrow">Access denied</p>
                                <h1>Restricted route</h1>
                                <p>
                                    You do not have permission to access this
                                    page.
                                </p>
                            </div>

                            <section className="state-card access-denied-card">
                                <img
                                    className="access-denied-illustration"
                                    src="/images/copper-golem-mc.gif"
                                    alt=""
                                    aria-hidden="true"
                                />
                                <h2>The registry seal blocks this route</h2>
                                <p>
                                    Return to the racing registry to continue
                                    with the areas available to your role.
                                </p>
                                <Link
                                    className="race-action-link"
                                    to="/"
                                >
                                    Return to home
                                </Link>
                            </section>
                        </section>
                    }
                />

                <Route
                    path="*"
                    element={<NotFoundPage />}
                />
            </Route>
        </Routes>
    )
}