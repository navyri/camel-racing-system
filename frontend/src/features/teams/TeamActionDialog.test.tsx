import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TeamActionDialog } from './TeamActionDialog'

describe('TeamActionDialog', () => {
    it('does not render while closed', () => {
        render(
            <TeamActionDialog
                isOpen={false}
                title="Deactivate team"
                description="This action changes the team status."
                confirmLabel="Deactivate team"
                isSubmitting={false}
                errorMessage={null}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        expect(
            screen.queryByRole('dialog'),
        ).not.toBeInTheDocument()
    })

    it('confirms the action', async () => {
        const onConfirm = vi.fn()

        render(
            <TeamActionDialog
                isOpen
                title="Deactivate team"
                description="This action changes the team status."
                confirmLabel="Deactivate team"
                isSubmitting={false}
                errorMessage={null}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Deactivate team',
            }),
        )

        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledTimes(1)
        })
    })

    it('closes using the cancel button', () => {
        const onClose = vi.fn()

        render(
            <TeamActionDialog
                isOpen
                title="Deactivate team"
                description="This action changes the team status."
                confirmLabel="Deactivate team"
                isSubmitting={false}
                errorMessage={null}
                onClose={onClose}
                onConfirm={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cancel',
            }),
        )

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes using escape when not submitting', () => {
        const onClose = vi.fn()

        render(
            <TeamActionDialog
                isOpen
                title="Deactivate team"
                description="This action changes the team status."
                confirmLabel="Deactivate team"
                isSubmitting={false}
                errorMessage={null}
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

    it('does not close using escape while submitting', () => {
        const onClose = vi.fn()

        render(
            <TeamActionDialog
                isOpen
                title="Deactivate team"
                description="This action changes the team status."
                confirmLabel="Deactivate team"
                isSubmitting
                errorMessage={null}
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

    it('shows an error message', () => {
        render(
            <TeamActionDialog
                isOpen
                title="Remove member"
                description="This action removes the active membership."
                confirmLabel="Remove member"
                isSubmitting={false}
                errorMessage="The member could not be removed."
                danger
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('alert'),
        ).toHaveTextContent('The member could not be removed.')
    })
})