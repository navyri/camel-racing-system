import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TeamForm } from './TeamForm'

describe('TeamForm', () => {
    it('shows validation errors for empty values', async () => {
        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting={false}
                submitError={null}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create team',
            }),
        )

        expect(
            await screen.findByText('Team name is required'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Description is required'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Coach name is required'),
        ).toBeInTheDocument()
    })

    it('submits valid values', async () => {
        const onSubmit = vi.fn()

        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting={false}
                submitError={null}
                onSubmit={onSubmit}
                onCancel={vi.fn()}
            />,
        )

        fireEvent.change(
            screen.getByLabelText('Team name'),
            {
                target: {
                    value: 'Desert Riders',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Coach name'),
            {
                target: {
                    value: 'Amina',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText('Description'),
            {
                target: {
                    value: 'A relay team for desert races',
                },
            },
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create team',
            }),
        )

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                name: 'Desert Riders',
                coachName: 'Amina',
                description: 'A relay team for desert races',
            })
        })
    })

    it('shows backend field errors', () => {
        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting={false}
                submitError={null}
                backendErrors={{
                    name: 'Team name is already in use',
                    coachName: 'Coach name is invalid',
                }}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(
            screen.getByText('Team name is already in use'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Coach name is invalid'),
        ).toBeInTheDocument()
    })

    it('shows a submit error', () => {
        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting={false}
                submitError="Team could not be saved right now."
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('alert'),
        ).toHaveTextContent('Team could not be saved right now.')
    })

    it('calls cancel when requested', () => {
        const onCancel = vi.fn()

        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting={false}
                submitError={null}
                onSubmit={vi.fn()}
                onCancel={onCancel}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Cancel',
            }),
        )

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('disables controls while submitting', () => {
        render(
            <TeamForm
                submitLabel="Create team"
                isSubmitting
                submitError={null}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Saving team...',
            }),
        ).toBeDisabled()

        expect(
            screen.getByRole('button', {
                name: 'Cancel',
            }),
        ).toBeDisabled()

        expect(screen.getByLabelText('Team name')).toBeDisabled()
        expect(screen.getByLabelText('Coach name')).toBeDisabled()
        expect(screen.getByLabelText('Description')).toBeDisabled()
    })
})