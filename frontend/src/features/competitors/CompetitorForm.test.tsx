import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CompetitorForm } from './CompetitorForm'
import {
    createEmptyCompetitorFormValues,
    type CompetitorFormErrors,
    type CompetitorFormValues,
} from './competitorTypes'

function renderCompetitorForm(
    overrides: Partial<{
        values: CompetitorFormValues
        fieldErrors: CompetitorFormErrors
        formError: string | null
        submitting: boolean
    }> = {},
) {
    const onValuesChange = vi.fn()
    const onAgeReferenceTypeChange = vi.fn()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
        <CompetitorForm
            values={overrides.values ?? createEmptyCompetitorFormValues()}
            fieldErrors={overrides.fieldErrors ?? {}}
            formError={overrides.formError ?? null}
            submitting={overrides.submitting ?? false}
            submitLabel="Create competitor"
            submittingLabel="Creating competitor..."
            onValuesChange={onValuesChange}
            onAgeReferenceTypeChange={onAgeReferenceTypeChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />,
    )

    return {
        onValuesChange,
        onAgeReferenceTypeChange,
        onSubmit,
        onCancel,
    }
}

describe('CompetitorForm', () => {
    it('renders every field required by the competitor request contract', () => {
        renderCompetitorForm()

        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Nickname')).toBeInTheDocument()
        expect(screen.getByLabelText('Competitor type')).toBeInTheDocument()
        expect(screen.getByLabelText('Origin')).toBeInTheDocument()
        expect(screen.getByLabelText('Date of birth')).toBeInTheDocument()
        expect(screen.getByLabelText('Approximate age')).toBeInTheDocument()
        expect(screen.getByLabelText('Weight in kg')).toBeInTheDocument()
        expect(screen.getByLabelText('Height in cm')).toBeInTheDocument()
    })

    it('uses the Colombian locale for the date of birth control', () => {
        renderCompetitorForm()

        expect(screen.getByLabelText('Date of birth')).toHaveAttribute(
            'lang',
            'es-CO',
        )
    })

    it('uses date of birth as the default active age reference', () => {
        renderCompetitorForm()

        expect(screen.getByLabelText('Date of birth')).toBeEnabled()
        expect(screen.getByLabelText('Approximate age')).toBeDisabled()
        expect(
            screen.getByRole('radio', { name: 'Use date of birth' }),
        ).toBeChecked()
    })

    it('notifies parent when the age reference changes', () => {
        const { onAgeReferenceTypeChange } = renderCompetitorForm()

        fireEvent.click(
            screen.getByRole('radio', { name: 'Use approximate age' }),
        )

        expect(onAgeReferenceTypeChange).toHaveBeenCalledWith(
            'approximateAge',
        )
    })

    it('uses approximate age when that reference is selected', () => {
        renderCompetitorForm({
            values: {
                ...createEmptyCompetitorFormValues(),
                ageReferenceType: 'approximateAge',
            },
        })

        expect(screen.getByLabelText('Date of birth')).toBeDisabled()
        expect(screen.getByLabelText('Approximate age')).toBeEnabled()
        expect(
            screen.getByRole('radio', { name: 'Use approximate age' }),
        ).toBeChecked()
    })

    it('sends field changes to the parent component', () => {
        const { onValuesChange } = renderCompetitorForm()

        fireEvent.change(screen.getByLabelText('Nickname'), {
            target: { value: 'ByteTheCamel' },
        })

        expect(onValuesChange).toHaveBeenCalledWith(
            expect.objectContaining({
                nickname: 'ByteTheCamel',
            }),
        )
    })

    it('submits once when no request is pending', () => {
        const { onSubmit } = renderCompetitorForm()

        fireEvent.submit(
            screen.getByRole('button', { name: 'Create competitor' }),
        )

        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit while a request is pending', () => {
        const { onSubmit } = renderCompetitorForm({
            submitting: true,
        })

        fireEvent.submit(
            screen.getByRole('button', { name: 'Creating competitor...' }),
        )

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows field errors and associates them with their controls', () => {
        renderCompetitorForm({
            fieldErrors: {
                nickname: 'Nickname is already in use',
                approximateAge: 'Approximate age must be positive',
            },
            formError: 'Review the highlighted fields before saving the competitor.',
            values: {
                ...createEmptyCompetitorFormValues(),
                ageReferenceType: 'approximateAge',
            },
        })

        const nicknameInput = screen.getByLabelText('Nickname')
        const ageInput = screen.getByLabelText('Approximate age')

        expect(
            screen.getByText(
                'Review the highlighted fields before saving the competitor.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Nickname is already in use'),
        ).toBeInTheDocument()
        expect(
            screen.getAllByText('Approximate age must be positive'),
        ).toHaveLength(2)
        expect(nicknameInput).toHaveAttribute('aria-invalid', 'true')
        expect(ageInput).toHaveAttribute('aria-invalid', 'true')
        expect(nicknameInput).toHaveAttribute(
            'aria-describedby',
            'competitor-field-hint-nickname competitor-field-error-nickname',
        )
        expect(ageInput).toHaveAttribute(
            'aria-describedby',
            'competitor-field-error-approximateAge',
        )
    })

    it('disables fields and cancellation while submitting', () => {
        const { onCancel } = renderCompetitorForm({
            submitting: true,
        })

        expect(screen.getByLabelText('Name')).toBeDisabled()
        expect(screen.getByLabelText('Nickname')).toBeDisabled()
        expect(screen.getByLabelText('Competitor type')).toBeDisabled()
        expect(screen.getByLabelText('Origin')).toBeDisabled()
        expect(screen.getByLabelText('Date of birth')).toBeDisabled()
        expect(screen.getByLabelText('Weight in kg')).toBeDisabled()
        expect(
            screen.getByRole('button', { name: 'Creating competitor...' }),
        ).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('calls cancel when no request is pending', () => {
        const { onCancel } = renderCompetitorForm()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })
})