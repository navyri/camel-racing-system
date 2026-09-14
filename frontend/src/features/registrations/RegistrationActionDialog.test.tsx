import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationActionDialog } from './RegistrationActionDialog'

function renderRegistrationActionDialog(
    overrides: Partial<{
        isOpen: boolean
        title: string
        description: string
        confirmLabel: string
        cancelLabel: string
        submitting: boolean
        error: string | null
        startingPosition: string
        startingPositionError: string
        availableStartingPositions: number[]
    }> = {},
) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const onStartingPositionChange = vi.fn()

    render(
        <RegistrationActionDialog
            isOpen={overrides.isOpen ?? true}
            title={overrides.title ?? 'Approve registration'}
            description={
                overrides.description ??
                'This registration will be approved.'
            }
            confirmLabel={overrides.confirmLabel ?? 'Approve'}
            cancelLabel={overrides.cancelLabel}
            submitting={overrides.submitting ?? false}
            error={overrides.error ?? null}
            startingPosition={overrides.startingPosition}
            startingPositionError={overrides.startingPositionError}
            availableStartingPositions={overrides.availableStartingPositions}
            onStartingPositionChange={
                overrides.startingPosition === undefined
                    ? undefined
                    : onStartingPositionChange
            }
            onConfirm={onConfirm}
            onCancel={onCancel}
        />,
    )

    return {
        onConfirm,
        onCancel,
        onStartingPositionChange,
    }
}

describe('RegistrationActionDialog', () => {
    it('does not render while closed', () => {
        renderRegistrationActionDialog({
            isOpen: false,
        })

        expect(
            screen.queryByRole('dialog'),
        ).not.toBeInTheDocument()
    })

    it('renders dialog content and default cancel label', () => {
        renderRegistrationActionDialog()

        expect(
            screen.getByRole('dialog', {
                name: 'Approve registration',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('This registration will be approved.'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Approve',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Keep registration',
            }),
        ).toBeInTheDocument()
    })

    it('renders position selector when approval position props are provided', () => {
        renderRegistrationActionDialog({
            startingPosition: '',
            availableStartingPositions: [1, 3, 5],
        })

        expect(
            screen.getByLabelText('Starting position'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: 'Select a starting position',
            }),
        ).toBeInTheDocument()
        expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: '3' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: '5' })).toBeInTheDocument()
        expect(
            screen.getByText(
                'Only positions not assigned to approved participants are available.',
            ),
        ).toBeInTheDocument()
    })

    it('sends the selected approval position to the parent component', () => {
        const { onStartingPositionChange } = renderRegistrationActionDialog({
            startingPosition: '',
            availableStartingPositions: [1, 2],
        })

        fireEvent.change(screen.getByLabelText('Starting position'), {
            target: {
                value: '2',
            },
        })

        expect(onStartingPositionChange).toHaveBeenCalledWith('2')
    })

    it('shows position errors and associates them with the selector', () => {
        renderRegistrationActionDialog({
            startingPosition: '',
            startingPositionError: 'Starting position is required',
            availableStartingPositions: [1, 2],
        })

        const startingPosition = screen.getByLabelText('Starting position')

        expect(
            screen.getByText('Starting position is required'),
        ).toBeInTheDocument()
        expect(startingPosition).toHaveAttribute('aria-invalid', 'true')
        expect(startingPosition).toHaveAttribute(
            'aria-describedby',
            'registration-starting-position-error',
        )
    })

    it('calls confirm and cancel handlers', () => {
        const { onConfirm, onCancel } = renderRegistrationActionDialog()

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Keep registration',
            }),
        )

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('closes on escape while not submitting', () => {
        const { onCancel } = renderRegistrationActionDialog()

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close on escape while submitting', () => {
        const { onCancel } = renderRegistrationActionDialog({
            submitting: true,
        })

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('closes when clicking the backdrop while not submitting', () => {
        const { onCancel } = renderRegistrationActionDialog()

        const backdrop = screen
            .getByRole('dialog')
            .parentElement

        if (!backdrop) {
            throw new Error('Dialog backdrop was not rendered')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking the backdrop while submitting', () => {
        const { onCancel } = renderRegistrationActionDialog({
            submitting: true,
        })

        const backdrop = screen
            .getByRole('dialog')
            .parentElement

        if (!backdrop) {
            throw new Error('Dialog backdrop was not rendered')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('shows errors inside an alert', () => {
        renderRegistrationActionDialog({
            error: 'Registration can no longer be approved.',
        })

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Registration can no longer be approved.',
        )
    })

    it('disables action buttons and position selection while submitting', () => {
        renderRegistrationActionDialog({
            submitting: true,
            startingPosition: '',
            availableStartingPositions: [1, 2],
        })

        expect(screen.getByLabelText('Starting position')).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Saving...',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Keep registration',
            }),
        ).toBeDisabled()
    })
})