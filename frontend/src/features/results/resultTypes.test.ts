import { describe, expect, it } from 'vitest'
import {
    createEmptyResultFormValues,
    createResultFormValues,
    formatRegistrationParticipant,
    formatResultParticipant,
    getResultStatusClassName,
    getResultStatusLabel,
    isFinishedResultStatus,
    toRaceResultCreateRequest,
    toRaceResultUpdateRequest,
    validateResultForm,
    type RaceResultResponse,
} from './resultTypes'

const teamResult: RaceResultResponse = {
    id: 'result-id',
    raceId: 'race-id',
    raceName: 'Team Results Race',
    registrationId: 'registration-id',
    competitorId: null,
    competitorName: null,
    competitorNickname: null,
    teamId: 'team-id',
    teamName: 'Moonlight Relay',
    startingPosition: 1,
    finalPosition: 1,
    completionTimeSeconds: 187,
    penaltyTimeSeconds: 0,
    status: 'FINISHED',
    notes: 'Clean finish',
    recordedByUserId: 'organizer-id',
    recordedByUsername: 'organizer',
    recordedAt: '2026-09-14T00:00:00',
}

describe('resultTypes', () => {
    it('creates empty result form values', () => {
        expect(createEmptyResultFormValues()).toEqual({
            registrationId: '',
            completionTimeSeconds: '',
            penaltyTimeSeconds: '0',
            status: 'FINISHED',
            notes: '',
        })
    })

    it('maps an existing result to editable form values', () => {
        expect(createResultFormValues(teamResult)).toEqual({
            registrationId: 'registration-id',
            completionTimeSeconds: '187',
            penaltyTimeSeconds: '0',
            status: 'FINISHED',
            notes: 'Clean finish',
        })
    })

    it('identifies finished statuses', () => {
        expect(isFinishedResultStatus('FINISHED')).toBe(true)
        expect(isFinishedResultStatus('DID_NOT_FINISH')).toBe(false)
    })

    it('formats result statuses', () => {
        expect(getResultStatusLabel('FINISHED')).toBe('Finished')
        expect(getResultStatusLabel('DID_NOT_FINISH')).toBe(
            'Did not finish',
        )
        expect(getResultStatusClassName('DISQUALIFIED')).toBe(
            'result-status-disqualified',
        )
    })

    it('formats individual and team participants', () => {
        expect(
            formatResultParticipant({
                ...teamResult,
                competitorId: 'competitor-id',
                competitorName: 'Desert Runner',
                competitorNickname: 'Runner',
                teamId: null,
                teamName: null,
            }),
        ).toBe('Desert Runner (Runner)')
        expect(formatResultParticipant(teamResult)).toBe('Moonlight Relay')
        expect(
            formatRegistrationParticipant({
                competitorName: null,
                competitorNickname: null,
                teamName: 'Moonlight Relay',
            }),
        ).toBe('Moonlight Relay')
    })

    it('validates required finished result fields', () => {
        expect(
            validateResultForm(
                {
                    registrationId: '',
                    completionTimeSeconds: '',
                    penaltyTimeSeconds: '',
                    status: 'FINISHED',
                    notes: '',
                },
                {
                    requireRegistration: true,
                },
            ),
        ).toEqual({
            registrationId: 'Approved registration is required',
            completionTimeSeconds:
                'Completion time is required for finished results',
            penaltyTimeSeconds:
                'Penalty time is required for finished results',
        })
    })

    it('validates finished result numeric values', () => {
        expect(
            validateResultForm(
                {
                    registrationId: 'registration-id',
                    completionTimeSeconds: '0',
                    penaltyTimeSeconds: '-1',
                    status: 'FINISHED',
                    notes: '',
                },
                {
                    requireRegistration: true,
                },
            ),
        ).toEqual({
            completionTimeSeconds:
                'Completion time must be a positive whole number of seconds',
            penaltyTimeSeconds:
                'Penalty time must be zero or a positive whole number of seconds',
        })
    })

    it('does not require final values for non finished statuses', () => {
        expect(
            validateResultForm(
                {
                    registrationId: 'registration-id',
                    completionTimeSeconds: '',
                    penaltyTimeSeconds: '',
                    status: 'DID_NOT_START',
                    notes: '',
                },
                {
                    requireRegistration: true,
                },
            ),
        ).toEqual({})
    })

    it('validates note length for every status', () => {
        expect(
            validateResultForm(
                {
                    registrationId: 'registration-id',
                    completionTimeSeconds: '',
                    penaltyTimeSeconds: '',
                    status: 'DISQUALIFIED',
                    notes: 'x'.repeat(1001),
                },
                {
                    requireRegistration: true,
                },
            ),
        ).toEqual({
            notes: 'Notes must not exceed 1000 characters',
        })
    })

    it('maps finished values to create request', () => {
        expect(
            toRaceResultCreateRequest({
                registrationId: 'registration-id',
                completionTimeSeconds: '187',
                penaltyTimeSeconds: '0',
                status: 'FINISHED',
                notes: ' Clean finish ',
            }),
        ).toEqual({
            registrationId: 'registration-id',
            completionTimeSeconds: 187,
            penaltyTimeSeconds: 0,
            status: 'FINISHED',
            notes: 'Clean finish',
        })
    })

    it('maps non finished values to normalized update request', () => {
        expect(
            toRaceResultUpdateRequest({
                registrationId: 'registration-id',
                completionTimeSeconds: '500',
                penaltyTimeSeconds: '12',
                status: 'DISQUALIFIED',
                notes: ' Rule violation ',
            }),
        ).toEqual({
            completionTimeSeconds: null,
            penaltyTimeSeconds: null,
            status: 'DISQUALIFIED',
            notes: 'Rule violation',
        })
    })
})