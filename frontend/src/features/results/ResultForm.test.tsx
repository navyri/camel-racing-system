import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RegistrationResponse } from '../registrations/registrationTypes'
import { ResultForm } from './ResultForm'
import {
    createEmptyResultFormValues,
    type ResultFormErrors,
    type ResultFormValues,
} from './resultTypes'

const registrations: RegistrationResponse[] = [
    {
        id: 'competitor-registration-id',
        raceId: 'race-id',
        competitorId: 'competitor-id',
        competitorName: 'Desert Runner',
        competitorNickname: 'Runner',
        teamId: null,
        teamName: null,
        registeredAt: '2026-09-14T00:00:00',
        status: 'APPROVED',
        startingPosition: 1,
        validationNotes: null,
        registeredByUserId: 'organizer-id',
        registeredByUsername: 'organizer',
    },
    {
        id: 'team-registration-id',
        raceId: 'race-id',
        competitorId: null,
        competitorName: null,
        competitorNickname: null,
        teamId: 'team-id',
        teamName: 'Moonlight Relay',
        registeredAt: '2026-09-14T00:00:00',
        status: 'APPROVED',
        startingPosition: 2,
        validationNotes: null,
        registeredByUserId: 'organizer-id',
        registeredByUsername: 'organizer',
    },
]

function renderResultForm(
    overrides: Partial<{
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
        <ResultForm
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

describe('ResultForm', () => {
    it('renders approved individual and team registration choices', () => {
        renderResultForm()

        expect(
            screen.getByLabelText('Approved participant registration'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: 'Desert Runner (Runner)',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: 'Moonlight Relay',
            }),
        ).toBeInTheDocument()
    })

    it('renders automatic ranking information and finished result fields', () => {
        renderResultForm()

        expect(
            screen.getByText(
                'Final position is calculated automatically from completion time, penalty time, recorded time, and result identifier.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.queryByLabelText('Final position'),
        ).not.toBeInTheDocument()
        expect(
            screen.getByLabelText('Completion time in seconds'),
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Penalty time in seconds'),
        ).toBeInTheDocument()
    })

    it('hides timing fields for non finished statuses', () => {
        renderResultForm({
            values: {
                ...createEmptyResultFormValues(),
                status: 'DID_NOT_START',
            },
        })

        expect(
            screen.queryByText(
                'Final position is calculated automatically from completion time, penalty time, recorded time, and result identifier.',
            ),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByLabelText('Completion time in seconds'),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByLabelText('Penalty time in seconds'),
        ).not.toBeInTheDocument()
    })

    it('sends changed registration selection to parent', () => {
        const { onValuesChange } = renderResultForm()

        fireEvent.change(
            screen.getByLabelText('Approved participant registration'),
            {
                target: {
                    name: 'registrationId',
                    value: 'team-registration-id',
                },
            },
        )

        expect(onValuesChange).toHaveBeenCalledWith({
            ...createEmptyResultFormValues(),
            registrationId: 'team-registration-id',
        })
    })

    it('sends changed result status to parent', () => {
        const { onValuesChange } = renderResultForm()

        fireEvent.change(screen.getByLabelText('Result status'), {
            target: {
                name: 'status',
                value: 'DISQUALIFIED',
            },
        })

        expect(onValuesChange).toHaveBeenCalledWith({
            ...createEmptyResultFormValues(),
            status: 'DISQUALIFIED',
        })
    })

    it('submits only once when not submitting', () => {
        const { onSubmit } = renderResultForm()

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Save result',
            }),
        )

        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit while submitting', () => {
        const { onSubmit } = renderResultForm({
            submitting: true,
        })

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Saving result...',
            }),
        )

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows associated field errors', () => {
        renderResultForm({
            fieldErrors: {
                registrationId: 'Approved registration is required',
                completionTimeSeconds:
                    'Completion time is required for finished results',
            },
            formError: 'Review the highlighted fields before saving the result.',
        })

        expect(
            screen.getByText(
                'Review the highlighted fields before saving the result.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByLabelText('Approved participant registration'),
        ).toHaveAttribute('aria-invalid', 'true')
        expect(
            screen.getByLabelText('Completion time in seconds'),
        ).toHaveAttribute('aria-invalid', 'true')
    })

    it('hides registration selector when editing', () => {
        renderResultForm({
            requireRegistration: false,
        })

        expect(
            screen.queryByLabelText('Approved participant registration'),
        ).not.toBeInTheDocument()
        expect(screen.getByLabelText('Result status')).toBeInTheDocument()
    })

    it('disables form controls while submitting', () => {
        const { onCancel } = renderResultForm({
            submitting: true,
        })

        expect(
            screen.getByLabelText('Approved participant registration'),
        ).toBeDisabled()
        expect(screen.getByLabelText('Result status')).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Saving result...',
            }),
        ).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).not.toHaveBeenCalled()
    })
})