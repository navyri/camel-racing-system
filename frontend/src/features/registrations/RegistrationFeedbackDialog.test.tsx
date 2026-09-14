import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationFeedbackDialog } from './RegistrationFeedbackDialog'

function renderDialog(
    overrides: Partial<{
        isOpen: boolean
        title: string
        message: string
    }> = {},
) {
    const onClose = vi.fn()

    render(
        <RegistrationFeedbackDialog
            isOpen={overrides.isOpen ?? true}
            title={overrides.title ?? 'Registration updated'}
            message={
                overrides.message ??
                'Registration was approved successfully.'
            }
            onClose={onClose}
        />,
    )

    return {
        onClose,
    }
}

describe('RegistrationFeedbackDialog', () => {
    it('does not render while closed', () => {
        renderDialog({
            isOpen: false,
        })

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders an accessible feedback dialog', () => {
        renderDialog()

        const dialog = screen.getByRole('dialog', {
            name: 'Registration updated',
        })

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute(
            'aria-labelledby',
            'registration-feedback-dialog-title',
        )
        expect(dialog).toHaveAttribute(
            'aria-describedby',
            'registration-feedback-dialog-description',
        )
        expect(
            screen.getByText('Registration was approved successfully.'),
        ).toBeInTheDocument()
    })

    it('focuses close action when opened', () => {
        renderDialog()

        expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    })

    it('closes through close action', () => {
        const { onClose } = renderDialog()

        fireEvent.click(screen.getByRole('button', { name: 'Close' }))

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes with Escape', () => {
        const { onClose } = renderDialog()

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes when clicking backdrop', () => {
        const { onClose } = renderDialog()

        const backdrop = screen.getByRole('dialog').parentElement

        if (!backdrop) {
            throw new Error('Registration feedback backdrop was not rendered.')
        }

        fireEvent.mouseDown(backdrop)

        expect(onClose).toHaveBeenCalledTimes(1)
    })
})