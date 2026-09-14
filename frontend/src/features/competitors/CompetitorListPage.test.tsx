import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/apiError'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'
import type { AppRole } from '../../auth/authTypes'
import type {
    CompetitorResponse,
    PageResponse,
} from './competitorTypes'

const getCompetitors = vi.fn()

vi.mock('../../api/competitorsApi', () => ({
    getCompetitors,
}))

const { CompetitorListPage } = await import('./CompetitorListPage')

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

function createPage(
    overrides: Partial<PageResponse<CompetitorResponse>> = {},
): PageResponse<CompetitorResponse> {
    return {
        content: [createCompetitor()],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
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

function renderCompetitorList(roles: AppRole[] = ['VIEWER']) {
    return render(
        <MemoryRouter>
            <AuthContext.Provider value={createAuthValue(roles)}>
                <CompetitorListPage />
            </AuthContext.Provider>
        </MemoryRouter>,
    )
}

beforeEach(() => {
    getCompetitors.mockReset()
})

describe('CompetitorListPage', () => {
    it('renders loading and then the competitor table', async () => {
        let resolveRequest: (value: PageResponse<CompetitorResponse>) => void =
            () => undefined

        getCompetitors.mockReturnValueOnce(
            new Promise<PageResponse<CompetitorResponse>>((resolve) => {
                resolveRequest = resolve
            }),
        )

        renderCompetitorList()

        expect(screen.getByText('Loading competitors...')).toBeInTheDocument()

        resolveRequest(createPage())

        expect(await screen.findByText('Byte')).toBeInTheDocument()

        const tableBody = screen.getByText('Byte').closest('tbody')

        expect(tableBody).not.toBeNull()

        if (!tableBody) {
            throw new Error('Competitor table body was not found.')
        }

        expect(within(tableBody).getByText('ByteTheCamel')).toBeInTheDocument()
        expect(within(tableBody).getByText('Camel')).toBeInTheDocument()
        expect(within(tableBody).getByText('Active')).toBeInTheDocument()
        expect(within(tableBody).getByText('Colombia')).toBeInTheDocument()
        expect(
            within(tableBody).getByText('3 wins, 1 defeats, 4 completed'),
        ).toBeInTheDocument()
    })

    it('renders an empty state', async () => {
        getCompetitors.mockResolvedValueOnce(
            createPage({
                content: [],
                totalElements: 0,
                totalPages: 0,
                empty: true,
            }),
        )

        renderCompetitorList()

        expect(
            await screen.findByText('No competitors found'),
        ).toBeInTheDocument()
    })

    it('renders a safe error message and retries the request', async () => {
        getCompetitors
            .mockRejectedValueOnce(new ApiError('Server failure', 500))
            .mockResolvedValueOnce(createPage())

        renderCompetitorList()

        expect(
            await screen.findByText(
                'The competitor service is currently unavailable. Please try again.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(await screen.findByText('Byte')).toBeInTheDocument()
        expect(getCompetitors).toHaveBeenCalledTimes(2)
    })

    it('resets the page when type or status filters change', async () => {
        getCompetitors
            .mockResolvedValueOnce(
                createPage({
                    page: 2,
                    totalPages: 4,
                    first: false,
                    last: false,
                }),
            )
            .mockResolvedValue(createPage())

        renderCompetitorList()

        await screen.findByText('Byte')

        fireEvent.change(screen.getByLabelText('Competitor type'), {
            target: { value: 'CAMEL' },
        })

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    type: 'CAMEL',
                    page: 0,
                }),
            )
        })

        fireEvent.change(screen.getByLabelText('Status'), {
            target: { value: 'ACTIVE' },
        })

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    type: 'CAMEL',
                    status: 'ACTIVE',
                    page: 0,
                }),
            )
        })
    })

    it('submits trimmed search and origin filters', async () => {
        getCompetitors.mockResolvedValue(createPage())

        renderCompetitorList()

        await screen.findByText('Byte')

        fireEvent.change(screen.getByLabelText('Search'), {
            target: { value: '  Byte  ' },
        })
        fireEvent.change(screen.getByLabelText('Origin'), {
            target: { value: '  Colombia  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Search' }))

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    search: 'Byte',
                    origin: 'Colombia',
                    page: 0,
                }),
            )
        })
    })

    it('keeps filters and sort when changing pages', async () => {
        getCompetitors.mockResolvedValue(
            createPage({
                totalElements: 50,
                totalPages: 2,
                first: true,
                last: false,
            }),
        )

        renderCompetitorList()

        await screen.findByText('Byte')

        fireEvent.change(screen.getByLabelText('Competitor type'), {
            target: { value: 'CAMEL' },
        })

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    type: 'CAMEL',
                    page: 0,
                }),
            )
        })

        fireEvent.change(screen.getByLabelText('Results per page'), {
            target: { value: '25' },
        })

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    type: 'CAMEL',
                    size: 25,
                    page: 0,
                }),
            )
        })

        fireEvent.change(screen.getByLabelText('Sort by'), {
            target: { value: 'nickname' },
        })

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    type: 'CAMEL',
                    size: 25,
                    sort: 'nickname,asc',
                    page: 0,
                }),
            )
        })

        getCompetitors.mockResolvedValueOnce(
            createPage({
                page: 1,
                size: 25,
                totalElements: 50,
                totalPages: 2,
                first: false,
                last: true,
            }),
        )

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => {
            expect(getCompetitors).toHaveBeenLastCalledWith({
                type: 'CAMEL',
                page: 1,
                size: 25,
                sort: 'nickname,asc',
            })
        })
    })

    it('links each competitor name to its detail page', async () => {
        getCompetitors.mockResolvedValueOnce(createPage())

        renderCompetitorList()

        const competitorLink = await screen.findByRole('link', {
            name: 'Byte',
        })

        expect(competitorLink).toHaveAttribute(
            'href',
            '/competitors/b0f7e000-14c4-486c-8b6d-032af41f0e75',
        )
    })

    it('shows create competitor only for administrator role', async () => {
        getCompetitors.mockResolvedValue(createPage())

        const { rerender } = renderCompetitorList(['ADMINISTRATOR'])

        expect(
            await screen.findByRole('link', { name: 'Create competitor' }),
        ).toHaveAttribute('href', '/competitors/new')

        rerender(
            <MemoryRouter>
                <AuthContext.Provider value={createAuthValue(['VIEWER'])}>
                    <CompetitorListPage />
                </AuthContext.Provider>
            </MemoryRouter>,
        )

        expect(
            screen.queryByRole('link', { name: 'Create competitor' }),
        ).not.toBeInTheDocument()
    })

    it('does not render write actions for organizer or viewer roles', async () => {
        getCompetitors.mockResolvedValue(createPage())

        const { rerender } = renderCompetitorList(['RACE_ORGANIZER'])

        await screen.findByText('Byte')

        expect(
            screen.queryByRole('link', { name: 'Create competitor' }),
        ).not.toBeInTheDocument()

        rerender(
            <MemoryRouter>
                <AuthContext.Provider value={createAuthValue(['VIEWER'])}>
                    <CompetitorListPage />
                </AuthContext.Provider>
            </MemoryRouter>,
        )

        expect(
            screen.queryByRole('link', { name: 'Create competitor' }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: /create|edit|retire|status/i,
            }),
        ).not.toBeInTheDocument()
    })
})