import { describe, expect, it } from 'vitest'

import {
    createEmptyTeamFormValues,
    defaultTeamFilters,
    getTeamRecordLabel,
    getTeamStatusClassName,
    getTeamStatusLabel,
    teamPageSizes,
    toTeamFormValues,
    toTeamRequest,
    validateTeamForm,
} from './teamTypes'

describe('teamTypes', () => {
    it('provides the default team filters', () => {
        expect(defaultTeamFilters).toEqual({
            status: '',
            search: '',
            page: 0,
            size: 10,
            sort: 'name,asc',
        })
    })

    it('provides team page sizes including five', () => {
        expect(teamPageSizes).toEqual([5, 10, 25, 50, 100])
    })

    it('returns readable labels for every team status', () => {
        expect(getTeamStatusLabel('ACTIVE')).toBe('Active')
        expect(getTeamStatusLabel('SUSPENDED')).toBe('Suspended')
        expect(getTeamStatusLabel('INACTIVE')).toBe('Inactive')
    })

    it('returns a css class name for every team status', () => {
        expect(getTeamStatusClassName('ACTIVE')).toBe('team-status-active')
        expect(getTeamStatusClassName('SUSPENDED')).toBe(
            'team-status-suspended',
        )
        expect(getTeamStatusClassName('INACTIVE')).toBe(
            'team-status-inactive',
        )
    })

    it('formats a team record label', () => {
        expect(getTeamRecordLabel(4, 2)).toBe('4 victories - 2 defeats')
    })

    it('creates empty form values', () => {
        expect(createEmptyTeamFormValues()).toEqual({
            name: '',
            description: '',
            coachName: '',
        })
    })

    it('maps a team response to form values', () => {
        expect(
            toTeamFormValues({
                id: 'team-1',
                name: 'Desert Riders',
                description: 'A relay racing team',
                coachName: 'Amina',
                status: 'ACTIVE',
                createdAt: '2026-09-13T12:00:00',
                victories: 3,
                defeats: 1,
                members: [],
            }),
        ).toEqual({
            name: 'Desert Riders',
            description: 'A relay racing team',
            coachName: 'Amina',
        })
    })

    it('validates required form values', () => {
        expect(
            validateTeamForm({
                name: ' ',
                description: '',
                coachName: '',
            }),
        ).toEqual({
            name: 'Team name is required',
            description: 'Description is required',
            coachName: 'Coach name is required',
        })
    })

    it('validates maximum field lengths', () => {
        expect(
            validateTeamForm({
                name: 'a'.repeat(151),
                description: 'b'.repeat(501),
                coachName: 'c'.repeat(151),
            }),
        ).toEqual({
            name: 'Team name must not exceed 150 characters',
            description: 'Description must not exceed 500 characters',
            coachName: 'Coach name must not exceed 150 characters',
        })
    })

    it('returns no errors for valid form values', () => {
        expect(
            validateTeamForm({
                name: 'Desert Riders',
                description: 'A relay racing team',
                coachName: 'Amina',
            }),
        ).toEqual({})
    })

    it('trims values before sending a team request', () => {
        expect(
            toTeamRequest({
                name: ' Desert Riders ',
                description: ' A relay racing team ',
                coachName: ' Amina ',
            }),
        ).toEqual({
            name: 'Desert Riders',
            description: 'A relay racing team',
            coachName: 'Amina',
        })
    })
})