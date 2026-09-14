import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuditLogPagination } from './AuditLogPagination'

function renderPagination(
    overrides: Partial<{
        page: number
        totalPages: number
        totalElements: number
        first: boolean
        last: boolean
        loading: boolean
    }> = {},
) {
    const onPreviousPage = vi.fn()
    const onNextPage = vi.fn()

    render(
        <AuditLogPagination
            page={overrides.page ?? 0}
            totalPages={overrides.totalPages ?? 3}
            totalElements={overrides.totalElements ?? 25}
            first={overrides.first ?? true}
            last={overrides.last ?? false}
            loading={overrides.loading ?? false}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
        />,
    )

    return {
        onPreviousPage,
        onNextPage,
    }
}

describe('AuditLogPagination', () => {
    it('renders page details and pagination controls', () => {
        renderPagination({
            page: 1,
            totalPages: 3,
            totalElements: 25,
            first: false,
            last: false,
        })

        expect(
            screen.getByRole('navigation', {
                name: 'Audit log pagination',
            }),
        ).toBeInTheDocument()
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
        expect(screen.getByText('25 audit logs')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    it('disables controls at page boundaries', () => {
        renderPagination({
            first: true,
            last: true,
            totalPages: 1,
            totalElements: 1,
        })

        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
        expect(screen.getByText('1 audit log')).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Previous',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Next',
            }),
        ).toBeDisabled()
    })

    it('disables controls while loading', () => {
        renderPagination({
            first: false,
            last: false,
            loading: true,
        })

        expect(
            screen.getByRole('button', {
                name: 'Previous',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Next',
            }),
        ).toBeDisabled()
    })

    it('calls the page actions', () => {
        const { onPreviousPage, onNextPage } = renderPagination({
            first: false,
            last: false,
        })

        fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(onPreviousPage).toHaveBeenCalledTimes(1)
        expect(onNextPage).toHaveBeenCalledTimes(1)
    })
})