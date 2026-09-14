import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationForm } from './RegistrationForm'
import {
    createEmptyRegistrationFormValues,
    type RegistrationFormErrors,
    type RegistrationFormValues,
} from './registrationTypes'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { TeamResponse } from '../teams/teamTypes'

const competitors: CompetitorResponse[] = [
    {
        id: 'b0f7e000-14c4-486c-8b6d-032af41f0e75',
        name: 'Byte',
        nickname: 'ByteTheCamel',
        competitorType: 'CAMEL',
        dateOfBirth: '2016-05-20',
        approximateAge: null,
        weightKg: 400,
        heightCm: 220,
        origin: 'Colombia',
        status: 'ACTIVE',
        registrationDate: '2026-09-13T07:45:00',
        victories: 0,
        defeats: 0,
        completedRaces: 0,
    },
]

const teams: TeamResponse[] = [
    {
        id: 'team-id',
        name: 'Desert Riders',
        description: 'A relay racing team',
        coachName: 'Amina',
        status: 'ACTIVE',
        createdAt: '2026-09-13T07:45:00',
        victories: 0,
        defeats: 0,
        members: [
            {
                competitorId: competitors[0].id,
                name: competitors[0].name,
                nickname: competitors[0].nickname,
                competitorType: competitors[0].competitorType,
                joinedAt: '2026-09-13T07:45:00',
            },
        ],
    },
]

function renderRegistrationForm(
    overrides: Partial<{
        values: RegistrationFormValues
        fieldErrors: RegistrationFormErrors
        formError: string | null
        submitting: boolean
        raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED'
        competitors: CompetitorResponse[]
        teams: TeamResponse[]
    }> = {},
) {
    const onValuesChange = vi.fn()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
        <RegistrationForm
            values={overrides.values ?? createEmptyRegistrationFormValues()}
            fieldErrors={overrides.fieldErrors ?? {}}
            formError={overrides.formError ?? null}
            submitting={overrides.submitting ?? false}
            raceType={overrides.raceType ?? 'INDIVIDUAL'}
            competitors={overrides.competitors ?? competitors}
            teams={overrides.teams ?? teams}
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

describe('RegistrationForm', () => {
    it('renders a selector for active competitors and approval position guidance', () => {
        renderRegistrationForm()

        expect(screen.getByLabelText('Competitor')).toBeInTheDocument()
        expect(
            screen.queryByRole('combobox', {
                name: 'Team',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('group', {
                name: 'Participant type',
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: 'Byte (ByteTheCamel)',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Starting position is selected when the registration is approved.',
            ),
        ).toBeInTheDocument()
    })

    it('renders a selector for eligible active teams in a team race', () => {
        renderRegistrationForm({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
        })

        expect(screen.queryByLabelText('Competitor')).not.toBeInTheDocument()
        expect(
            screen.getByRole('combobox', {
                name: 'Team',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('option', {
                name: 'Desert Riders',
            }),
        ).toBeInTheDocument()
    })

    it('renders participant mode choices for a mixed race', () => {
        renderRegistrationForm({
            raceType: 'MIXED',
        })

        expect(
            screen.getByRole('group', {
                name: 'Participant type',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', {
                name: 'Individual competitor',
            }),
        ).toBeChecked()
        expect(screen.getByLabelText('Competitor')).toBeInTheDocument()
        expect(
            screen.queryByRole('combobox', {
                name: 'Team',
            }),
        ).not.toBeInTheDocument()
    })

    it('switches to team mode and clears the competitor selection', () => {
        const { onValuesChange } = renderRegistrationForm({
            raceType: 'MIXED',
            values: {
                participantMode: 'INDIVIDUAL',
                competitorId: competitors[0].id,
                teamId: '',
            },
        })

        fireEvent.click(
            screen.getByRole('radio', {
                name: 'Team',
            }),
        )

        expect(onValuesChange).toHaveBeenCalledWith({
            participantMode: 'TEAM',
            competitorId: '',
            teamId: '',
        })
    })

    it('sends changed competitor values to the parent component', () => {
        const { onValuesChange } = renderRegistrationForm()

        fireEvent.change(screen.getByLabelText('Competitor'), {
            target: {
                value: competitors[0].id,
            },
        })

        expect(onValuesChange).toHaveBeenCalledWith({
            participantMode: 'INDIVIDUAL',
            competitorId: competitors[0].id,
            teamId: '',
        })
    })

    it('sends changed team values to the parent component', () => {
        const { onValuesChange } = renderRegistrationForm({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
        })

        fireEvent.change(
            screen.getByRole('combobox', {
                name: 'Team',
            }),
            {
                target: {
                    value: teams[0].id,
                },
            },
        )

        expect(onValuesChange).toHaveBeenCalledWith({
            participantMode: 'TEAM',
            competitorId: '',
            teamId: teams[0].id,
        })
    })

    it('submits once when no request is pending', () => {
        const { onSubmit } = renderRegistrationForm()

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Register participant',
            }),
        )

        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('does not submit while a request is pending', () => {
        const { onSubmit } = renderRegistrationForm({
            submitting: true,
        })

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Registering participant...',
            }),
        )

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows competitor errors and associates them with the control', () => {
        renderRegistrationForm({
            fieldErrors: {
                competitorId: 'Competitor is required',
            },
            formError:
                'Review the highlighted fields before saving the registration.',
        })

        const competitorInput = screen.getByLabelText('Competitor')

        expect(
            screen.getByText(
                'Review the highlighted fields before saving the registration.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Competitor is required'),
        ).toBeInTheDocument()
        expect(competitorInput).toHaveAttribute('aria-invalid', 'true')
        expect(competitorInput).toHaveAttribute(
            'aria-describedby',
            'registration-field-error-competitorId',
        )
    })

    it('shows team errors and associates them with the control', () => {
        renderRegistrationForm({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
            fieldErrors: {
                teamId: 'Team is required',
            },
            formError:
                'Review the highlighted fields before saving the registration.',
        })

        const teamInput = screen.getByRole('combobox', {
            name: 'Team',
        })

        expect(screen.getByText('Team is required')).toBeInTheDocument()
        expect(teamInput).toHaveAttribute('aria-invalid', 'true')
        expect(teamInput).toHaveAttribute(
            'aria-describedby',
            'registration-field-error-teamId',
        )
    })

    it('disables controls and cancellation while submitting', () => {
        const { onCancel } = renderRegistrationForm({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
            submitting: true,
        })

        expect(
            screen.getByRole('combobox', {
                name: 'Team',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Registering participant...',
            }),
        ).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Cancel',
            }),
        ).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('calls cancel when no request is pending', () => {
        const { onCancel } = renderRegistrationForm()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })
})