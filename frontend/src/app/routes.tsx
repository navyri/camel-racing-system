import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { RoleGuard } from '../auth/RoleGuard'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'
import { AdminPage } from '../pages/AdminPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/" element={<HomePage />} />
                <Route
                    path="/admin"
                    element={
                        <RoleGuard role="ADMIN">
                            <AdminPage />
                        </RoleGuard>
                    }
                />
            </Route>
            <Route path="/forbidden" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    )
}