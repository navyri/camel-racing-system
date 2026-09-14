import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TeamFilters } from './TeamFilters'
import { defaultTeamFilters } from './teamTypes'

describe('TeamFilters', () => {
    it('updates the search filter', () => {
        const onChange = vi.fn()

        render(
            <TeamFilters
                filters={defaultTeamFilters}
                disabled={false}
                onChange={onChange}
                onRefresh={vi.fn()}
            />,
        )

        fireEvent.change(
            screen.getByLabelText('Search teams'),
            {
                target: {
                    value: 'Desert',
                },
            },
        )

        expect(onChange).toHaveBeenCalledWith({
            ...defaultTeamFilters,
            search: 'Desert',
            page: 0,
        })
    })

    it('updates the status filter', () => {
        const onChange = vi.fn()

        render(
            <TeamFilters
                filters={defaultTeamFilters}
                disabled={false}
                onChange={onChange}
                onRefresh={vi.fn()}
            />,
        )

        fireEvent.change(
            screen.getByLabelText('Status'),
            {
                target: {
                    value: 'ACTIVE',
                },
            },
        )

        expect(onChange).toHaveBeenCalledWith({
            ...defaultTeamFilters,
            status: 'ACTIVE',
            page: 0,
        })
    })

    it('offers five as an additional page size', () => {
        render(
            <TeamFilters
                filters={defaultTeamFilters}
                disabled={false}
                onChange={vi.fn()}
                onRefresh={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('option', {
                name: '5',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: '10',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: '25',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: '50',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: '100',
            }),
        ).toBeInTheDocument()
    })

    it('updates page size and returns to first page', () => {
        const onChange = vi.fn()

        render(
            <TeamFilters
                filters={{
                    ...defaultTeamFilters,
                    page: 2,
                }}
                disabled={false}
                onChange={onChange}
                onRefresh={vi.fn()}
            />,
        )

        fireEvent.change(
            screen.getByLabelText('Results per page'),
            {
                target: {
                    value: '25',
                },
            },
        )

        expect(onChange).toHaveBeenCalledWith({
            ...defaultTeamFilters,
            page: 0,
            size: 25,
        })
    })

    it('refreshes teams when requested', () => {
        const onRefresh = vi.fn()

        render(
            <TeamFilters
                filters={defaultTeamFilters}
                disabled={false}
                onChange={vi.fn()}
                onRefresh={onRefresh}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Refresh teams',
            }),
        )

        expect(onRefresh).toHaveBeenCalledTimes(1)
    })
})