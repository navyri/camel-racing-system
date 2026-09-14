import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TeamMemberDialog } from './TeamMemberDialog'

const competitors = [
    {
        id: 'competitor-1',
        name: 'Sand Runner',
        nickname: 'Runner',
        competitorType: 'DROMEDARY',
    },
    {
        id: 'competitor-2',
        name: 'Moon Walker',
        nickname: '',
        competitorType: 'BACTRIAN',
    },
]

describe('TeamMemberDialog', () => {
    it('does not render when closed', () => {
        render(
            <TeamMemberDialog
                isOpen={false}
                isSubmitting={false}
                errorMessage={null}
                competitors={competitors}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        expect(
            screen.queryByRole('dialog'),
        ).not.toBeInTheDocument()
    })

    it('requires a competitor selection', async () => {
        render(
            <TeamMemberDialog
                isOpen
                isSubmitting={false}
                errorMessage={null}
                competitors={competitors}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Add member',
            }),
        )

        expect(
            await screen.findByText(
                'Select an active competitor first.',
            ),
        ).toBeInTheDocument()
    })

    it('adds the selected competitor', async () => {
        const onConfirm = vi.fn()

        render(
            <TeamMemberDialog
                isOpen
                isSubmitting={false}
                errorMessage={null}
                competitors={competitors}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        )

        fireEvent.change(
            screen.getByLabelText('Active competitor'),
            {
                target: {
                    value: 'competitor-1',
                },
            },
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Add member',
            }),
        )

        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith('competitor-1')
        })
    })

    it('closes with escape when not submitting', () => {
        const onClose = vi.fn()

        render(
            <TeamMemberDialog
                isOpen
                isSubmitting={false}
                errorMessage={null}
                competitors={competitors}
                onClose={onClose}
                onConfirm={vi.fn()}
            />,
        )

        fireEvent.keyDown(
            screen.getByRole('dialog'),
            {
                key: 'Escape',
            },
        )

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not close with escape while submitting', () => {
        const onClose = vi.fn()

        render(
            <TeamMemberDialog
                isOpen
                isSubmitting
                errorMessage={null}
                competitors={competitors}
                onClose={onClose}
                onConfirm={vi.fn()}
            />,
        )

        fireEvent.keyDown(
            screen.getByRole('dialog'),
            {
                key: 'Escape',
            },
        )

        expect(onClose).not.toHaveBeenCalled()
    })

    it('shows server errors', () => {
        render(
            <TeamMemberDialog
                isOpen
                isSubmitting={false}
                errorMessage="Competitor already belongs to an active team."
                competitors={competitors}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('alert'),
        ).toHaveTextContent(
            'Competitor already belongs to an active team.',
        )
    })

    it('shows an empty state when no competitors are available', () => {
        render(
            <TeamMemberDialog
                isOpen
                isSubmitting={false}
                errorMessage={null}
                competitors={[]}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        expect(
            screen.getByText(
                'No active competitors are available to add.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', {
                name: 'Add member',
            }),
        ).toBeDisabled()
    })
})