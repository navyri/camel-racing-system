import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationRejectDialog } from './RegistrationRejectDialog'

function renderRegistrationRejectDialog(
    overrides: Partial<{
        isOpen: boolean
        registrationLabel: string
        submitting: boolean
        error: string | null
    }> = {},
) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
        <RegistrationRejectDialog
            isOpen={overrides.isOpen ?? true}
            registrationLabel={
                overrides.registrationLabel ?? 'Byte (ByteTheCamel)'
            }
            submitting={overrides.submitting ?? false}
            error={overrides.error ?? null}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />,
    )

    return {
        onConfirm,
        onCancel,
    }
}

describe('RegistrationRejectDialog', () => {
    it('does not render while closed', () => {
        renderRegistrationRejectDialog({
            isOpen: false,
        })

        expect(
            screen.queryByRole('dialog'),
        ).not.toBeInTheDocument()
    })

    it('renders the registration label and input fields', () => {
        renderRegistrationRejectDialog()

        expect(
            screen.getByRole('dialog', {
                name: 'Reject registration',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Provide a reason for rejecting Byte (ByteTheCamel).',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Rejection reason'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Keep pending',
            }),
        ).toBeInTheDocument()
    })

    it('requires a non-empty reason', () => {
        const { onConfirm } = renderRegistrationRejectDialog()

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        )

        expect(onConfirm).not.toHaveBeenCalled()
        expect(
            screen.getByText('A rejection reason is required.'),
        ).toBeInTheDocument()
    })

    it('trims and submits a valid reason', () => {
        const { onConfirm } = renderRegistrationRejectDialog()

        fireEvent.change(
            screen.getByLabelText('Rejection reason'),
            {
                target: {
                    value: '  Missing required medical document.  ',
                },
            },
        )

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        )

        expect(onConfirm).toHaveBeenCalledWith(
            'Missing required medical document.',
        )
    })

    it('rejects a reason exceeding the allowed limit', () => {
        const { onConfirm } = renderRegistrationRejectDialog()

        fireEvent.change(
            screen.getByLabelText('Rejection reason'),
            {
                target: {
                    value: 'a'.repeat(1001),
                },
            },
        )

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        )

        expect(onConfirm).not.toHaveBeenCalled()
        expect(
            screen.getByText(
                'The rejection reason cannot exceed 1000 characters.',
            ),
        ).toBeInTheDocument()
    })

    it('clears the local validation error when the reason changes', () => {
        renderRegistrationRejectDialog()

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Reject registration',
            }),
        )

        expect(
            screen.getByText('A rejection reason is required.'),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Rejection reason'),
            {
                target: {
                    value: 'Required document is missing.',
                },
            },
        )

        expect(
            screen.queryByText('A rejection reason is required.'),
        ).not.toBeInTheDocument()
    })

    it('calls cancel through the button, escape key and backdrop', () => {
        const { onCancel } = renderRegistrationRejectDialog()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Keep pending',
            }),
        )

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        const backdrop = screen
            .getByRole('dialog')
            .parentElement

        if (!backdrop) {
            throw new Error('Dialog backdrop was not rendered')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).toHaveBeenCalledTimes(3)
    })

    it('does not close or submit while submitting', () => {
        const { onCancel, onConfirm } = renderRegistrationRejectDialog({
            submitting: true,
        })

        const textarea = screen.getByLabelText('Rejection reason')

        expect(textarea).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Rejecting registration...',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Keep pending',
            }),
        ).toBeDisabled()

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Rejecting registration...',
            }),
        )

        expect(onCancel).not.toHaveBeenCalled()
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it('shows backend errors inside an alert', () => {
        renderRegistrationRejectDialog({
            error: 'This registration was already processed.',
        })

        expect(screen.getByRole('alert')).toHaveTextContent(
            'This registration was already processed.',
        )
    })
})