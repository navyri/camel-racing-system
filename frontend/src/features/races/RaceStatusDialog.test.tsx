import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RaceStatusDialog } from './RaceStatusDialog'

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
        <RaceStatusDialog
            open={overrides.open ?? true}
            title={overrides.title ?? 'Cancel race'}
            description={
                overrides.description ??
                'Cancelling this race is destructive and cannot be undone from this screen.'
            }
            confirmLabel={overrides.confirmLabel ?? 'Cancel race'}
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

describe('RaceStatusDialog', () => {
    it('does not render when closed', () => {
        renderDialog({
            open: false,
        })

        expect(
            screen.queryByRole('dialog'),
        ).not.toBeInTheDocument()
    })

    it('renders an accessible confirmation dialog', () => {
        renderDialog()

        const dialog = screen.getByRole('dialog')

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute(
            'aria-labelledby',
            'race-status-dialog-title',
        )
        expect(dialog).toHaveAttribute(
            'aria-describedby',
            'race-status-dialog-description',
        )
        expect(
            screen.getByRole('heading', { name: 'Cancel race' }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Cancelling this race is destructive and cannot be undone from this screen.',
            ),
        ).toBeInTheDocument()
    })

    it('focuses the safe action when opened', () => {
        renderDialog()

        expect(
            screen.getByRole('button', { name: 'Keep current state' }),
        ).toHaveFocus()
    })

    it('calls cancel when the safe action is selected', () => {
        const { onCancel } = renderDialog()

        fireEvent.click(
            screen.getByRole('button', { name: 'Keep current state' }),
        )

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls confirm when the confirmation action is selected', () => {
        const { onConfirm } = renderDialog({
            confirmLabel: 'Open registration',
        })

        fireEvent.click(
            screen.getByRole('button', { name: 'Open registration' }),
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
            confirmLabel: 'Start race',
        })

        expect(screen.getByText('Updating race...')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Keep current state' }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', { name: 'Working...' }),
        ).toBeDisabled()
    })

    it('shows backend errors without closing the dialog', () => {
        renderDialog({
            error: 'Race cannot be completed without an official winner',
        })

        expect(
            screen.getByText(
                'Race cannot be completed without an official winner',
            ),
        ).toBeInTheDocument()
    })
})