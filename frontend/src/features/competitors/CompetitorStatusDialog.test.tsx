import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CompetitorStatusDialog } from './CompetitorStatusDialog'

function renderDialog(
    overrides: Partial<{
        open: boolean
        title: string
        description: string
        confirmLabel: string
        submitting: boolean
        error: string | null
    }> = {},
) {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
        <CompetitorStatusDialog
            open={overrides.open ?? true}
            title={overrides.title ?? 'Retire competitor'}
            description={
                overrides.description ??
                'Retiring this competitor is a permanent status change.'
            }
            confirmLabel={overrides.confirmLabel ?? 'Retire competitor'}
            submitting={overrides.submitting ?? false}
            error={overrides.error ?? null}
            onCancel={onCancel}
            onConfirm={onConfirm}
        />,
    )

    return {
        onCancel,
        onConfirm,
    }
}

describe('CompetitorStatusDialog', () => {
    it('does not render when closed', () => {
        renderDialog({
            open: false,
        })

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders an accessible confirmation dialog', () => {
        renderDialog()

        const dialog = screen.getByRole('dialog')

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute(
            'aria-labelledby',
            'competitor-status-dialog-title',
        )
        expect(dialog).toHaveAttribute(
            'aria-describedby',
            'competitor-status-dialog-description',
        )
        expect(
            screen.getByRole('heading', { name: 'Retire competitor' }),
        ).toBeInTheDocument()
    })

    it('focuses the safe action when opened', () => {
        renderDialog()

        expect(
            screen.getByRole('button', { name: 'Keep current status' }),
        ).toHaveFocus()
    })

    it('calls cancel when the safe action is selected', () => {
        const { onCancel } = renderDialog()

        fireEvent.click(
            screen.getByRole('button', { name: 'Keep current status' }),
        )

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls confirm when the confirmation action is selected', () => {
        const { onConfirm } = renderDialog({
            confirmLabel: 'Mark as injured',
        })

        fireEvent.click(
            screen.getByRole('button', { name: 'Mark as injured' }),
        )

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('closes with Escape when no request is pending', () => {
        const { onCancel } = renderDialog()

        fireEvent.keyDown(window, {
            key: 'Escape',
        })

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close with Escape while submitting', () => {
        const { onCancel } = renderDialog({
            submitting: true,
        })

        fireEvent.keyDown(window, {
            key: 'Escape',
        })

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('disables actions and shows progress while submitting', () => {
        renderDialog({
            submitting: true,
            confirmLabel: 'Suspend competitor',
        })

        expect(
            screen.getByText('Updating competitor...'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Keep current status' }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', { name: 'Working...' }),
        ).toBeDisabled()
    })

    it('shows backend errors without closing the dialog', () => {
        renderDialog({
            error: 'A retired competitor cannot be reactivated',
        })

        expect(
            screen.getByText(
                'A retired competitor cannot be reactivated',
            ),
        ).toBeInTheDocument()
    })
})