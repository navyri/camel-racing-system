import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RaceForm } from './RaceForm'
import {
    createEmptyRaceFormValues,
    type RaceFormErrors,
    type RaceFormValues,
} from './raceTypes'

function renderRaceForm(
    overrides: Partial<{
        values: RaceFormValues
        fieldErrors: RaceFormErrors
        formError: string | null
        submitting: boolean
    }> = {},
) {
    const onValuesChange = vi.fn()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
        <RaceForm
            values={overrides.values ?? createEmptyRaceFormValues()}
            fieldErrors={overrides.fieldErrors ?? {}}
            formError={overrides.formError ?? null}
            submitting={overrides.submitting ?? false}
            submitLabel="Create race"
            submittingLabel="Creating race..."
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

describe('RaceForm', () => {
    it('renders every field required by the race request contract', () => {
        renderRaceForm()

        expect(screen.getByLabelText('Race name')).toBeInTheDocument()
        expect(screen.getByLabelText('Race type')).toBeInTheDocument()
        expect(screen.getByLabelText('Scheduled at')).toBeInTheDocument()
        expect(
            screen.getByLabelText('Registration deadline'),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Start location')).toBeInTheDocument()
        expect(screen.getByLabelText('Finish location')).toBeInTheDocument()
        expect(
            screen.getByLabelText('Distance in meters'),
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText('Maximum participants'),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('uses the Colombian locale for date and time controls', () => {
        renderRaceForm()

        expect(screen.getByLabelText('Scheduled at')).toHaveAttribute(
            'lang',
            'es-CO',
        )
        expect(
            screen.getByLabelText('Registration deadline'),
        ).toHaveAttribute(
            'lang',
            'es-CO',
        )
    })

    it('requires at least two maximum participants', () => {
        renderRaceForm()

        const maximumParticipants = screen.getByLabelText(
            'Maximum participants',
        )

        expect(maximumParticipants).toHaveAttribute('min', '2')
        expect(
            screen.getByText('A race requires at least two participants.'),
        ).toBeInTheDocument()
        expect(maximumParticipants).toHaveAttribute(
            'aria-describedby',
            'race-field-hint-maxParticipants',
        )
    })

    it('sends changed field values to the parent component', () => {
        const { onValuesChange } = renderRaceForm()

        fireEvent.change(screen.getByLabelText('Race name'), {
            target: { value: 'Dawn Route' },
        })

        expect(onValuesChange).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Dawn Route',
            }),
        )
    })

    it('submits the form once when it is ready', () => {
        const { onSubmit } = renderRaceForm()

        fireEvent.submit(screen.getByRole('button', { name: 'Create race' }))

        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit while a request is pending', () => {
        const { onSubmit } = renderRaceForm({
            submitting: true,
        })

        fireEvent.submit(
            screen.getByRole('button', { name: 'Creating race...' }),
        )

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows backend validation errors next to matching fields', () => {
        renderRaceForm({
            fieldErrors: {
                name: 'Race name is required',
                distanceMeters: 'Distance must be greater than zero',
                maxParticipants: 'Maximum participants must be at least 2',
            },
            formError: 'Review the highlighted fields before saving the race.',
        })

        const nameInput = screen.getByLabelText('Race name')
        const distanceInput = screen.getByLabelText('Distance in meters')
        const maximumParticipants = screen.getByLabelText(
            'Maximum participants',
        )

        expect(
            screen.getByText(
                'Review the highlighted fields before saving the race.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('Race name is required')).toBeInTheDocument()
        expect(
            screen.getByText('Distance must be greater than zero'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Maximum participants must be at least 2'),
        ).toBeInTheDocument()
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        expect(distanceInput).toHaveAttribute('aria-invalid', 'true')
        expect(maximumParticipants).toHaveAttribute('aria-invalid', 'true')
        expect(nameInput).toHaveAttribute(
            'aria-describedby',
            'race-field-error-name',
        )
        expect(distanceInput).toHaveAttribute(
            'aria-describedby',
            'race-field-error-distanceMeters',
        )
        expect(maximumParticipants).toHaveAttribute(
            'aria-describedby',
            'race-field-hint-maxParticipants race-field-error-maxParticipants',
        )
    })

    it('associates date and time field errors with their controls', () => {
        renderRaceForm({
            fieldErrors: {
                scheduledAt: 'Scheduled date must be in the future',
            },
        })

        expect(screen.getByLabelText('Scheduled at')).toHaveAttribute(
            'aria-describedby',
            'race-field-error-scheduledAt',
        )
    })

    it('disables controls and blocks cancellation while submitting', () => {
        const { onCancel } = renderRaceForm({
            submitting: true,
        })

        expect(screen.getByLabelText('Race name')).toBeDisabled()
        expect(screen.getByLabelText('Race type')).toBeDisabled()
        expect(screen.getByLabelText('Description')).toBeDisabled()
        expect(
            screen.getByRole('button', { name: 'Creating race...' }),
        ).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('calls cancel when no request is pending', () => {
        const { onCancel } = renderRaceForm()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })
})