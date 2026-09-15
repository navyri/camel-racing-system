import { describe, expect, it } from 'vitest'
import {
    canApproveRegistration,
    canCancelRegistration,
    canCreateIndividualRegistration,
    canCreateRegistration,
    canCreateTeamRegistration,
    canRejectRegistration,
    createEmptyRegistrationApprovalFormValues,
    createEmptyRegistrationFormValues,
    formatRegistrationStatus,
    toRegistrationApprovalRequest,
    toRegistrationRequest,
    validateRegistrationApprovalForm,
    validateRegistrationForm,
} from './registrationTypes'

describe('registrationTypes', () => {
    it('creates empty registration form values', () => {
        expect(createEmptyRegistrationFormValues()).toEqual({
            participantMode: 'INDIVIDUAL',
            competitorId: '',
            teamId: '',
        })
    })

    it('creates empty registration approval form values', () => {
        expect(createEmptyRegistrationApprovalFormValues()).toEqual({
            startingPosition: '',
        })
    })

    it('requires a competitor for an individual registration', () => {
        expect(
            validateRegistrationForm({
                participantMode: 'INDIVIDUAL',
                competitorId: '   ',
                teamId: '',
            }),
        ).toEqual({
            competitorId: 'Competitor is required',
        })
    })

    it('accepts an individual registration with a competitor', () => {
        expect(
            validateRegistrationForm({
                participantMode: 'INDIVIDUAL',
                competitorId: 'competitor-id',
                teamId: '',
            }),
        ).toEqual({})
    })

    it('requires a team for a team registration', () => {
        expect(
            validateRegistrationForm({
                participantMode: 'TEAM',
                competitorId: '',
                teamId: '   ',
            }),
        ).toEqual({
            teamId: 'Team is required',
        })
    })

    it('accepts a team registration with a team', () => {
        expect(
            validateRegistrationForm({
                participantMode: 'TEAM',
                competitorId: '',
                teamId: 'team-id',
            }),
        ).toEqual({})
    })

    it('requires a starting position when approving', () => {
        expect(
            validateRegistrationApprovalForm({
                startingPosition: '   ',
            }),
        ).toEqual({
            startingPosition: 'Starting position is required',
        })
    })

    it('accepts a selected starting position when approving', () => {
        expect(
            validateRegistrationApprovalForm({
                startingPosition: '2',
            }),
        ).toEqual({})
    })

    it('maps individual values to the registration request contract', () => {
        expect(
            toRegistrationRequest({
                participantMode: 'INDIVIDUAL',
                competitorId: ' competitor-id ',
                teamId: '',
            }),
        ).toEqual({
            competitorId: 'competitor-id',
            teamId: null,
            startingPosition: null,
        })
    })

    it('maps team values to the registration request contract', () => {
        expect(
            toRegistrationRequest({
                participantMode: 'TEAM',
                competitorId: '',
                teamId: ' team-id ',
            }),
        ).toEqual({
            competitorId: null,
            teamId: 'team-id',
            startingPosition: null,
        })
    })

    it('maps approval form values to the approval request contract', () => {
        expect(
            toRegistrationApprovalRequest({
                startingPosition: ' 2 ',
            }),
        ).toEqual({
            startingPosition: 2,
        })
    })

    it('formats registration statuses', () => {
        expect(formatRegistrationStatus('PENDING')).toBe('Pending')
        expect(formatRegistrationStatus('APPROVED')).toBe('Approved')
        expect(formatRegistrationStatus('REJECTED')).toBe('Rejected')
        expect(formatRegistrationStatus('CANCELLED')).toBe('Cancelled')
    })

    it('allows approval and rejection only for pending registrations', () => {
        expect(canApproveRegistration('PENDING')).toBe(true)
        expect(canApproveRegistration('APPROVED')).toBe(false)
        expect(canRejectRegistration('PENDING')).toBe(true)
        expect(canRejectRegistration('REJECTED')).toBe(false)
    })

    it('allows cancellation only for pending or approved registrations while registration is open', () => {
        expect(
            canCancelRegistration('PENDING', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCancelRegistration('APPROVED', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCancelRegistration('REJECTED', 'OPEN_FOR_REGISTRATION'),
        ).toBe(false)
        expect(
            canCancelRegistration('CANCELLED', 'OPEN_FOR_REGISTRATION'),
        ).toBe(false)
    })

    it('blocks cancellation when registration is not open', () => {
        expect(
            canCancelRegistration('PENDING', 'DRAFT'),
        ).toBe(false)
        expect(
            canCancelRegistration('APPROVED', 'CLOSED_FOR_REGISTRATION'),
        ).toBe(false)
        expect(
            canCancelRegistration('APPROVED', 'IN_PROGRESS'),
        ).toBe(false)
        expect(
            canCancelRegistration('APPROVED', 'COMPLETED'),
        ).toBe(false)
        expect(
            canCancelRegistration('APPROVED', 'CANCELLED'),
        ).toBe(false)
    })

    it('allows individual registrations only for compatible open races', () => {
        expect(
            canCreateIndividualRegistration(
                'INDIVIDUAL',
                'OPEN_FOR_REGISTRATION',
            ),
        ).toBe(true)
        expect(
            canCreateIndividualRegistration(
                'MIXED',
                'OPEN_FOR_REGISTRATION',
            ),
        ).toBe(true)
        expect(
            canCreateIndividualRegistration(
                'TEAM',
                'OPEN_FOR_REGISTRATION',
            ),
        ).toBe(false)
        expect(
            canCreateIndividualRegistration(
                'INDIVIDUAL',
                'CLOSED_FOR_REGISTRATION',
            ),
        ).toBe(false)
    })

    it('allows team registrations only for compatible open races', () => {
        expect(
            canCreateTeamRegistration('TEAM', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCreateTeamRegistration('MIXED', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCreateTeamRegistration('INDIVIDUAL', 'OPEN_FOR_REGISTRATION'),
        ).toBe(false)
        expect(
            canCreateTeamRegistration('TEAM', 'CLOSED_FOR_REGISTRATION'),
        ).toBe(false)
    })

    it('allows a registration when at least one participant mode is compatible', () => {
        expect(
            canCreateRegistration('INDIVIDUAL', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCreateRegistration('TEAM', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCreateRegistration('MIXED', 'OPEN_FOR_REGISTRATION'),
        ).toBe(true)
        expect(
            canCreateRegistration('MIXED', 'CLOSED_FOR_REGISTRATION'),
        ).toBe(false)
    })
})