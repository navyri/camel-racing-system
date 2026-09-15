import { describe, expect, it } from 'vitest'
import {
    canCancelRace,
    createEmptyRaceFormValues,
    createRaceFormValues,
    defaultRacePage,
    defaultRacePageSize,
    defaultRaceSort,
    getAvailableRaceStatusTransitions,
    isTerminalRaceStatus,
    raceSortFields,
    raceStatuses,
    raceTypes,
    sortDirections,
    toRaceRequest,
    validateRaceForm,
    type RaceResponse,
} from './raceTypes'

const raceResponse: RaceResponse = {
    id: '2f173f4a-2059-4f42-a591-394183aec8f0',
    name: 'Desert Dawn Race',
    description: 'A race across the desert.',
    scheduledAt: '2030-08-25T10:00:00',
    startLocation: 'Desert Gate',
    finishLocation: 'Oasis Finish',
    distanceMeters: 5000,
    maxParticipants: 20,
    raceType: 'MIXED',
    status: 'DRAFT',
    organizerId: '7d5c6f83-2faa-446e-96db-6a7f437985a2',
    organizerUsername: 'organizer',
    registrationDeadline: '2030-08-24T10:00:00',
    createdAt: '2030-08-01T10:00:00',
    updatedAt: '2030-08-01T10:00:00',
}

describe('race contract types', () => {
    it('matches the backend race statuses exactly', () => {
        expect(raceStatuses).toEqual([
            'DRAFT',
            'OPEN_FOR_REGISTRATION',
            'CLOSED_FOR_REGISTRATION',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
        ])
    })

    it('matches the backend race types exactly', () => {
        expect(raceTypes).toEqual(['INDIVIDUAL', 'TEAM', 'MIXED'])
    })

    it('uses the supported sort fields, directions and defaults', () => {
        expect(raceSortFields).toEqual([
            'name',
            'scheduledAt',
            'registrationDeadline',
            'createdAt',
            'updatedAt',
            'maxParticipants',
        ])
        expect(sortDirections).toEqual(['asc', 'desc'])
        expect(defaultRacePage).toBe(0)
        expect(defaultRacePageSize).toBe(10)
        expect(defaultRaceSort).toBe('scheduledAt,asc')
    })

    it('exposes valid next transitions for each active status', () => {
        expect(getAvailableRaceStatusTransitions('DRAFT')).toMatchObject([
            {
                nextStatus: 'OPEN_FOR_REGISTRATION',
                actionLabel: 'Open registration',
            },
        ])
        expect(
            getAvailableRaceStatusTransitions('OPEN_FOR_REGISTRATION'),
        ).toMatchObject([
            {
                nextStatus: 'CLOSED_FOR_REGISTRATION',
                actionLabel: 'Close registration',
            },
        ])
        expect(
            getAvailableRaceStatusTransitions('CLOSED_FOR_REGISTRATION'),
        ).toMatchObject([
            {
                nextStatus: 'OPEN_FOR_REGISTRATION',
                actionLabel: 'Reopen registration',
            },
            {
                nextStatus: 'IN_PROGRESS',
                actionLabel: 'Start race',
            },
        ])
        expect(getAvailableRaceStatusTransitions('IN_PROGRESS')).toMatchObject([
            {
                nextStatus: 'COMPLETED',
                actionLabel: 'Complete race',
            },
        ])
        expect(getAvailableRaceStatusTransitions('COMPLETED')).toEqual([])
        expect(getAvailableRaceStatusTransitions('CANCELLED')).toEqual([])
    })

    it('matches cancellation and terminal status rules', () => {
        expect(canCancelRace('DRAFT')).toBe(true)
        expect(canCancelRace('OPEN_FOR_REGISTRATION')).toBe(true)
        expect(canCancelRace('CLOSED_FOR_REGISTRATION')).toBe(true)
        expect(canCancelRace('IN_PROGRESS')).toBe(false)
        expect(canCancelRace('COMPLETED')).toBe(false)
        expect(canCancelRace('CANCELLED')).toBe(false)

        expect(isTerminalRaceStatus('DRAFT')).toBe(false)
        expect(isTerminalRaceStatus('IN_PROGRESS')).toBe(false)
        expect(isTerminalRaceStatus('COMPLETED')).toBe(true)
        expect(isTerminalRaceStatus('CANCELLED')).toBe(true)
    })

    it('creates edit form values without backend controlled fields', () => {
        expect(createEmptyRaceFormValues()).toEqual({
            name: '',
            description: '',
            scheduledAt: '',
            startLocation: '',
            finishLocation: '',
            distanceMeters: '',
            maxParticipants: '',
            raceType: '',
            registrationDeadline: '',
        })

        expect(createRaceFormValues(raceResponse)).toEqual({
            name: 'Desert Dawn Race',
            description: 'A race across the desert.',
            scheduledAt: '2030-08-25T10:00',
            startLocation: 'Desert Gate',
            finishLocation: 'Oasis Finish',
            distanceMeters: '5000',
            maxParticipants: '20',
            raceType: 'MIXED',
            registrationDeadline: '2030-08-24T10:00',
        })
    })

    it('validates the real race request constraints', () => {
        const errors = validateRaceForm(
            {
                name: '   ',
                description: '',
                scheduledAt: '2030-08-25T10:00',
                startLocation: '',
                finishLocation: '',
                distanceMeters: '0',
                maxParticipants: '2.5',
                raceType: '',
                registrationDeadline: '2030-08-26T10:00',
            },
            new Date('2030-08-20T10:00:00'),
        )

        expect(errors).toEqual({
            name: 'Race name is required',
            description: 'Description is required',
            startLocation: 'Start location is required',
            finishLocation: 'Finish location is required',
            distanceMeters: 'Distance must be greater than zero',
            maxParticipants: 'Maximum participants must be at least 2',
            raceType: 'Race type is required',
            registrationDeadline:
                'Registration deadline must be before the scheduled date',
        })
    })

    it('rejects one maximum participant', () => {
        const errors = validateRaceForm(
            {
                name: 'Desert Dawn Race',
                description: 'A race across the desert.',
                scheduledAt: '2030-08-25T10:00',
                startLocation: 'Desert Gate',
                finishLocation: 'Oasis Finish',
                distanceMeters: '5000',
                maxParticipants: '1',
                raceType: 'MIXED',
                registrationDeadline: '2030-08-24T10:00',
            },
            new Date('2030-08-20T10:00:00'),
        )

        expect(errors).toEqual({
            maxParticipants: 'Maximum participants must be at least 2',
        })
    })

    it('maps valid form values to the real request payload', () => {
        const values = createRaceFormValues(raceResponse)

        expect(
            validateRaceForm(values, new Date('2030-08-20T10:00:00')),
        ).toEqual({})

        expect(toRaceRequest(values)).toEqual({
            name: 'Desert Dawn Race',
            description: 'A race across the desert.',
            scheduledAt: '2030-08-25T10:00:00',
            startLocation: 'Desert Gate',
            finishLocation: 'Oasis Finish',
            distanceMeters: 5000,
            maxParticipants: 20,
            raceType: 'MIXED',
            registrationDeadline: '2030-08-24T10:00:00',
        })
    })
})