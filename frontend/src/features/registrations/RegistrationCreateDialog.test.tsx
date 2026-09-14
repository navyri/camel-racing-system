import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationCreateDialog } from './RegistrationCreateDialog'
import type { CompetitorResponse } from '../competitors/competitorTypes'
import type { TeamResponse } from '../teams/teamTypes'
import {
    createEmptyRegistrationFormValues,
    type RegistrationFormErrors,
    type RegistrationFormValues,
} from './registrationTypes'

const competitors: CompetitorResponse[] = [
    {
        id: 'competitor-id',
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

function renderDialog(
    overrides: Partial<{
        isOpen: boolean
        values: RegistrationFormValues
        fieldErrors: RegistrationFormErrors
        formError: string | null
        submitting: boolean
        raceType: 'INDIVIDUAL' | 'TEAM' | 'MIXED'
    }> = {},
) {
    const onValuesChange = vi.fn()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
        <RegistrationCreateDialog
            isOpen={overrides.isOpen ?? true}
            values={
                overrides.values ?? createEmptyRegistrationFormValues()
            }
            fieldErrors={overrides.fieldErrors ?? {}}
            formError={overrides.formError ?? null}
            submitting={overrides.submitting ?? false}
            raceType={overrides.raceType ?? 'INDIVIDUAL'}
            competitors={competitors}
            teams={teams}
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

describe('RegistrationCreateDialog', () => {
    it('does not render while closed', () => {
        renderDialog({
            isOpen: false,
        })

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders an accessible individual registration dialog', () => {
        renderDialog()

        const dialog = screen.getByRole('dialog', {
            name: 'Register individual participant',
        })

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute(
            'aria-labelledby',
            'registration-create-dialog-title',
        )
        expect(dialog).toHaveAttribute(
            'aria-describedby',
            'registration-create-dialog-description',
        )
        expect(
            screen.getByText(
                'Only active competitors can be registered in this race.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Competitor')).toBeInTheDocument()
    })

    it('renders a team registration dialog for team races', () => {
        renderDialog({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
        })

        expect(
            screen.getByRole('dialog', {
                name: 'Register team participant',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Only eligible active teams can be registered in this race.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Team')).toBeInTheDocument()
        expect(screen.queryByLabelText('Competitor')).not.toBeInTheDocument()
    })

    it('renders a mixed registration dialog with participant choices', () => {
        renderDialog({
            raceType: 'MIXED',
        })

        expect(
            screen.getByRole('dialog', {
                name: 'Register race participant',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Choose an active individual competitor or an eligible active team for this race.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('group', {
                name: 'Participant type',
            }),
        ).toBeInTheDocument()
    })

    it('focuses the competitor selector when an individual dialog opens', () => {
        renderDialog()

        expect(screen.getByLabelText('Competitor')).toHaveFocus()
    })

    it('focuses the team selector when a team dialog opens', () => {
        renderDialog({
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
        })

        expect(screen.getByLabelText('Team')).toHaveFocus()
    })

    it('submits registration form values', () => {
        const { onSubmit } = renderDialog()

        fireEvent.submit(
            screen.getByRole('button', {
                name: 'Register participant',
            }),
        )

        expect(onSubmit).toHaveBeenCalledTimes(1)
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

    it('closes when clicking the backdrop while not submitting', () => {
        const { onCancel } = renderDialog()

        const backdrop = screen.getByRole('dialog').parentElement

        if (!backdrop) {
            throw new Error('Registration create backdrop was not rendered.')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking the backdrop while submitting', () => {
        const { onCancel } = renderDialog({
            submitting: true,
        })

        const backdrop = screen.getByRole('dialog').parentElement

        if (!backdrop) {
            throw new Error('Registration create backdrop was not rendered.')
        }

        fireEvent.mouseDown(backdrop)

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('disables team form controls while submitting', () => {
        renderDialog({
            submitting: true,
            raceType: 'TEAM',
            values: {
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '',
            },
        })

        expect(screen.getByLabelText('Team')).toBeDisabled()
        expect(
            screen.getByRole('button', {
                name: 'Registering participant...',
            }),
        ).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })
})