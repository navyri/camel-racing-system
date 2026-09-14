import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/apiError'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'
import type { AppRole } from '../../auth/authTypes'
import type { CompetitorResponse } from './competitorTypes'

const getCompetitorById = vi.fn()
const retireCompetitor = vi.fn()
const updateCompetitorStatus = vi.fn()

vi.mock('../../api/competitorsApi', () => ({
    getCompetitorById,
    retireCompetitor,
    updateCompetitorStatus,
}))

const { CompetitorDetailPage } = await import('./CompetitorDetailPage')

function createCompetitor(
    overrides: Partial<CompetitorResponse> = {},
): CompetitorResponse {
    return {
        id: 'b0f7e000-14c4-486c-8b6d-032af41f0e75',
        name: 'Byte',
        nickname: 'ByteTheCamel',
        competitorType: 'CAMEL',
        dateOfBirth: '2016-05-20',
        approximateAge: null,
        weightKg: 400,
        heightCm: 220,
        origin: 'Colombia',
        status: 'ACTIVE',
        registrationDate: '2026-09-13T03:00:00',
        victories: 3,
        defeats: 1,
        completedRaces: 4,
        ...overrides,
    }
}

function createAuthValue(roles: AppRole[]): AuthContextValue {
    return {
        initialized: true,
        authenticated: true,
        user: {
            username: 'test-user',
            displayName: 'Test User',
            roles,
        },
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: (role) => roles.includes(role as AppRole),
    }
}

function renderCompetitorDetail(
    roles: AppRole[] = ['VIEWER'],
    initialEntry = '/competitors/b0f7e000-14c4-486c-8b6d-032af41f0e75',
) {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <AuthContext.Provider value={createAuthValue(roles)}>
                <Routes>
                    <Route
                        path="/competitors/:competitorId"
                        element={<CompetitorDetailPage />}
                    />
                </Routes>
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    getCompetitorById.mockReset()
    retireCompetitor.mockReset()
    updateCompetitorStatus.mockReset()
})

describe('CompetitorDetailPage', () => {
    it('renders loading and then competitor detail', async () => {
        let resolveRequest: (value: CompetitorResponse) => void = () =>
            undefined

        getCompetitorById.mockReturnValueOnce(
            new Promise<CompetitorResponse>((resolve) => {
                resolveRequest = resolve
            }),
        )

        renderCompetitorDetail()

        expect(
            screen.getByText('Loading competitor detail...'),
        ).toBeInTheDocument()

        resolveRequest(createCompetitor())

        expect(
            await screen.findByRole('heading', { name: 'Byte' }),
        ).toBeInTheDocument()
        expect(screen.getByText('ByteTheCamel')).toBeInTheDocument()
        expect(screen.getByText('Camel')).toBeInTheDocument()
        expect(screen.getByText('Colombia')).toBeInTheDocument()
        expect(screen.getByText('20/05/2016')).toBeInTheDocument()
        expect(screen.getByText('13/09/2026, 03:00')).toBeInTheDocument()
        expect(screen.getByText(/400 kg/)).toBeInTheDocument()
        expect(screen.getByText(/220 cm/)).toBeInTheDocument()
    })

    it('does not render management actions for viewer or organizer', async () => {
        getCompetitorById.mockResolvedValue(createCompetitor())

        const { rerender } = renderCompetitorDetail(['VIEWER'])

        await screen.findByRole('heading', { name: 'Byte' })

        expect(
            screen.queryByRole('link', { name: 'Edit competitor' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Mark as injured' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Retire competitor' }),
        ).not.toBeInTheDocument()

        rerender(
            <MemoryRouter
                initialEntries={[
                    '/competitors/b0f7e000-14c4-486c-8b6d-032af41f0e75',
                ]}
            >
                <AuthContext.Provider
                    value={createAuthValue(['RACE_ORGANIZER'])}
                >
                    <Routes>
                        <Route
                            path="/competitors/:competitorId"
                            element={<CompetitorDetailPage />}
                        />
                    </Routes>
                </AuthContext.Provider>
            </MemoryRouter>,
        )

        expect(
            screen.queryByRole('link', { name: 'Edit competitor' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Retire competitor' }),
        ).not.toBeInTheDocument()
    })

    it('renders administrator actions for active competitor', async () => {
        getCompetitorById.mockResolvedValueOnce(createCompetitor())

        renderCompetitorDetail(['ADMINISTRATOR'])

        expect(
            await screen.findByRole('link', { name: 'Edit competitor' }),
        ).toHaveAttribute(
            'href',
            '/competitors/b0f7e000-14c4-486c-8b6d-032af41f0e75/edit',
        )
        expect(
            screen.getByRole('button', { name: 'Mark as injured' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Suspend competitor' }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Retire competitor' }),
        ).toBeInTheDocument()
    })

    it('hides actions for retired competitor', async () => {
        getCompetitorById.mockResolvedValueOnce(
            createCompetitor({
                status: 'RETIRED',
            }),
        )

        renderCompetitorDetail(['ADMINISTRATOR'])

        await screen.findByRole('heading', { name: 'Byte' })

        expect(
            screen.queryByRole('link', { name: 'Edit competitor' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Mark as active' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Retire competitor' }),
        ).not.toBeInTheDocument()
    })

    it('shows not found state for a missing competitor', async () => {
        getCompetitorById.mockRejectedValueOnce(
            new ApiError('Competitor missing', 404),
        )

        renderCompetitorDetail()

        expect(
            await screen.findByText('The requested competitor was not found.'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Return to competitors' }),
        ).toHaveAttribute('href', '/competitors')
    })

    it('retries loading after a service error', async () => {
        getCompetitorById
            .mockRejectedValueOnce(new ApiError('Service failure', 500))
            .mockResolvedValueOnce(createCompetitor())

        renderCompetitorDetail()

        expect(
            await screen.findByText(
                'The competitor service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(
            await screen.findByRole('heading', { name: 'Byte' }),
        ).toBeInTheDocument()
        expect(getCompetitorById).toHaveBeenCalledTimes(2)
    })

    it('returns focus to the status action after closing the dialog', async () => {
        getCompetitorById.mockResolvedValueOnce(createCompetitor())

        renderCompetitorDetail(['ADMINISTRATOR'])

        const statusButton = await screen.findByRole('button', {
            name: 'Mark as injured',
        })

        fireEvent.click(statusButton)

        expect(screen.getByRole('dialog')).toBeInTheDocument()

        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Keep current status',
            }),
        )

        await waitFor(() => {
            expect(statusButton).toHaveFocus()
        })
    })

    it('updates status after confirmation and shows success feedback', async () => {
        getCompetitorById.mockResolvedValueOnce(createCompetitor())
        updateCompetitorStatus.mockResolvedValueOnce(
            createCompetitor({
                status: 'INJURED',
            }),
        )

        renderCompetitorDetail(['ADMINISTRATOR'])

        fireEvent.click(
            await screen.findByRole('button', { name: 'Mark as injured' }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Mark as injured',
        })

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Mark as injured',
            }),
        )

        await waitFor(() => {
            expect(updateCompetitorStatus).toHaveBeenCalledWith(
                'b0f7e000-14c4-486c-8b6d-032af41f0e75',
                {
                    status: 'INJURED',
                },
            )
        })

        expect(
            await screen.findByText('Competitor status changed to Injured.'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Mark as active' }),
        ).toBeInTheDocument()
    })

    it('retires competitor after confirmation and hides management actions', async () => {
        getCompetitorById.mockResolvedValueOnce(createCompetitor())
        retireCompetitor.mockResolvedValueOnce(undefined)

        renderCompetitorDetail(['ADMINISTRATOR'])

        fireEvent.click(
            await screen.findByRole('button', { name: 'Retire competitor' }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Retire competitor',
        })

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Retire competitor',
            }),
        )

        await waitFor(() => {
            expect(retireCompetitor).toHaveBeenCalledWith(
                'b0f7e000-14c4-486c-8b6d-032af41f0e75',
            )
        })

        expect(
            await screen.findByText('Competitor was retired successfully.'),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', { name: 'Edit competitor' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Retire competitor' }),
        ).not.toBeInTheDocument()
    })

    it('keeps dialog open and shows conflict errors', async () => {
        getCompetitorById.mockResolvedValueOnce(
            createCompetitor({
                status: 'INJURED',
            }),
        )
        updateCompetitorStatus.mockRejectedValueOnce(
            new ApiError(
                'A retired competitor cannot be reactivated',
                409,
            ),
        )

        renderCompetitorDetail(['ADMINISTRATOR'])

        fireEvent.click(
            await screen.findByRole('button', { name: 'Mark as active' }),
        )

        const dialog = screen.getByRole('dialog', {
            name: 'Mark as active',
        })

        fireEvent.click(
            within(dialog).getByRole('button', {
                name: 'Mark as active',
            }),
        )

        expect(
            await screen.findByText(
                'A retired competitor cannot be reactivated',
            ),
        ).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
})