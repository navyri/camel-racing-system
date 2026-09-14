import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TeamPagination } from './TeamPagination'

describe('TeamPagination', () => {
    it('shows the current page and results range', () => {
        render(
            <TeamPagination
                page={1}
                totalPages={3}
                totalElements={25}
                pageSize={10}
                disabled={false}
                onPageChange={vi.fn()}
            />,
        )

        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
        expect(
            screen.getByText('Showing 11-20 of 25 teams'),
        ).toBeInTheDocument()
    })

    it('disables previous on the first page', () => {
        render(
            <TeamPagination
                page={0}
                totalPages={3}
                totalElements={25}
                pageSize={10}
                disabled={false}
                onPageChange={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Previous',
            }),
        ).toBeDisabled()
    })

    it('disables next on the final page', () => {
        render(
            <TeamPagination
                page={2}
                totalPages={3}
                totalElements={25}
                pageSize={10}
                disabled={false}
                onPageChange={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Next',
            }),
        ).toBeDisabled()
    })

    it('changes pages using pagination controls', () => {
        const onPageChange = vi.fn()

        render(
            <TeamPagination
                page={1}
                totalPages={3}
                totalElements={25}
                pageSize={10}
                disabled={false}
                onPageChange={onPageChange}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Previous',
            }),
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Next',
            }),
        )

        expect(onPageChange).toHaveBeenNthCalledWith(1, 0)
        expect(onPageChange).toHaveBeenNthCalledWith(2, 2)
    })
})