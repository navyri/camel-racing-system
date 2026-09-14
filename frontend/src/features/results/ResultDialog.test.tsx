import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import { ResultDialog } from './ResultDialog'
import {
    createEmptyResultFormValues,
    type ResultFormErrors,
    type ResultFormValues,
} from './resultTypes'

const registrations: RegistrationResponse[] = [
    {
        id: 'registration-id',
        raceId: 'race-id',
        competitorId: null,
        competitorName: null,
        competitorNickname: null,
        teamId: 'team-id',
        teamName: 'Moonlight Relay',
        registeredAt: '2026-09-14T00:00:00',
        status: 'APPROVED',
        startingPosition: 1,
        validationNotes: null,
        registeredByUserId: 'organizer-id',
        registeredByUsername: 'organizer',
    },
]

function renderDialog(
    overrides: Partial<{
        isOpen: boolean
        values: ResultFormValues
        fieldErrors: ResultFormErrors
        formError: string | null
        submitting: boolean
        requireRegistration: boolean
    }> = {},
) {
    const onValuesChange = vi.fn()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
        <ResultDialog
            isOpen={overrides.isOpen ?? true}
            title="Record official result"
            description="Record an official result for an approved participant."
            values={overrides.values ?? createEmptyResultFormValues()}
            fieldErrors={overrides.fieldErrors ?? {}}
            formError={overrides.formError ?? null}
            submitting={overrides.submitting ?? false}
            registrations={registrations}
            requireRegistration={overrides.requireRegistration ?? true}
            onValuesChange={onValuesChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />,
    )

    return {
        onValuesChange,
        onSubmit,
        onCancel,
    }
}

describe('ResultDialog', () => {
    it('does not render while closed', () => {
        renderDialog({
            isOpen: false,
        })

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders an accessible result dialog', () => {
        renderDialog()

        const dialog = screen.getByRole('dialog', {
            name: 'Record official result',
        })

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute(
            'aria-labelledby',
            'result-dialog-title',
        )
        expect(dialog).toHaveAttribute(
            'aria-describedby',
            'result-dialog-description',
        )
    })

    it('focuses registration selector while creating', () => {
        renderDialog()

        expect(
            screen.getByLabelText('Approved participant registration'),
        ).toHaveFocus()
    })

    it('focuses result status while editing', () => {
        renderDialog({
            requireRegistration: false,
        })

        expect(screen.getByLabelText('Result status')).toHaveFocus()
    })

    it('closes with Escape while not submitting', () => {
        const { onCancel } = renderDialog()

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close with Escape while submitting', () => {
        const { onCancel } = renderDialog({
            submitting: true,
        })

        fireEvent.keyDown(screen.getByRole('dialog'), {
            key: 'Escape',
        })

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('closes when clicking backdrop while not submitting', () => {
        const { onCancel } = renderDialog()

        const backdrop = screen.getByRole('dialog').parentElement

        if (!backdrop) {
            throw new Error('Result dialog backdrop was not rendered.')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking backdrop while submitting', () => {
        const { onCancel } = renderDialog({
            submitting: true,
        })

        const backdrop = screen.getByRole('dialog').parentElement

        if (!backdrop) {
            throw new Error('Result dialog backdrop was not rendered.')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).not.toHaveBeenCalled()
    })
})