import { describe, expect, it } from 'vitest'
import {
    competitorSortFields,
    competitorStatuses,
    competitorTypes,
    createCompetitorFormValues,
    createDefaultCompetitorListFilters,
    createEmptyCompetitorFormValues,
    getCompetitorStatusOptions,
    isRetiredCompetitor,
    setCompetitorAgeReferenceType,
    toCompetitorRequest,
    validateCompetitorForm,
    type CompetitorResponse,
} from './competitorTypes'

const competitor: CompetitorResponse = {
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
    registrationDate: '2026-09-13T03:00:00',
    victories: 0,
    defeats: 0,
    completedRaces: 0,
}

describe('competitor contract types', () => {
    it('matches the backend competitor statuses and types exactly', () => {
        expect(competitorStatuses).toEqual([
            'ACTIVE',
            'INJURED',
            'SUSPENDED',
            'RETIRED',
        ])
        expect(competitorTypes).toEqual([
            'DWARF',
            'CAMEL',
            'MEDIUM',
            'OTHER',
        ])
    })

    it('uses the backend sort fields and defaults', () => {
        expect(competitorSortFields).toEqual([
            'name',
            'nickname',
            'registrationDate',
            'victories',
            'defeats',
            'completedRaces',
        ])
        expect(createDefaultCompetitorListFilters()).toEqual({
            page: 0,
            size: 10,
            sort: 'name,asc',
        })
    })

    it('creates empty form values with date of birth as the default reference', () => {
        expect(createEmptyCompetitorFormValues()).toEqual({
            name: '',
            nickname: '',
            competitorType: '',
            ageReferenceType: 'dateOfBirth',
            dateOfBirth: '',
            approximateAge: '',
            weightKg: '',
            heightCm: '',
            origin: '',
        })
    })

    it('creates form values from a competitor response', () => {
        expect(createCompetitorFormValues(competitor)).toEqual({
            name: 'Byte',
            nickname: 'ByteTheCamel',
            competitorType: 'CAMEL',
            ageReferenceType: 'dateOfBirth',
            dateOfBirth: '2016-05-20',
            approximateAge: '',
            weightKg: '400',
            heightCm: '220',
            origin: 'Colombia',
        })
    })

    it('switches age reference and clears the inactive value', () => {
        const values = createCompetitorFormValues(competitor)

        expect(
            setCompetitorAgeReferenceType(values, 'approximateAge'),
        ).toEqual({
            ...values,
            ageReferenceType: 'approximateAge',
            dateOfBirth: '',
        })

        expect(
            setCompetitorAgeReferenceType(
                {
                    ...values,
                    approximateAge: '21',
                },
                'dateOfBirth',
            ),
        ).toEqual({
            ...values,
            ageReferenceType: 'dateOfBirth',
            approximateAge: '',
        })
    })

    it('provides only valid operational status options', () => {
        expect(getCompetitorStatusOptions('ACTIVE')).toEqual([
            expect.objectContaining({
                status: 'INJURED',
                actionLabel: 'Mark as injured',
            }),
            expect.objectContaining({
                status: 'SUSPENDED',
                actionLabel: 'Suspend competitor',
            }),
        ])
        expect(getCompetitorStatusOptions('RETIRED')).toEqual([])
        expect(isRetiredCompetitor('RETIRED')).toBe(true)
        expect(isRetiredCompetitor('ACTIVE')).toBe(false)
    })

    it('validates the competitor request contract', () => {
        const errors = validateCompetitorForm(
            {
                name: '   ',
                nickname: '',
                competitorType: '',
                ageReferenceType: 'approximateAge',
                dateOfBirth: '',
                approximateAge: '0',
                weightKg: '0',
                heightCm: '',
                origin: '',
            },
            new Date('2026-09-13T00:00:00'),
        )

        expect(errors).toEqual({
            name: 'Name is required',
            nickname: 'Nickname is required',
            origin: 'Origin is required',
            competitorType: 'Competitor type is required',
            approximateAge: 'Approximate age must be positive',
            weightKg: 'Weight must be greater than zero',
            heightCm: 'Height is required',
        })
    })

    it('rejects birth date that is not in the past', () => {
        const errors = validateCompetitorForm(
            {
                ...createCompetitorFormValues(competitor),
                dateOfBirth: '2026-09-13',
            },
            new Date('2026-09-13T12:00:00'),
        )

        expect(errors).toEqual({
            dateOfBirth: 'Date of birth must be in the past',
        })
    })

    it('maps a valid form to the backend request contract', () => {
        const values = {
            ...createCompetitorFormValues(competitor),
            name: '  Byte  ',
            nickname: '  ByteTheCamel  ',
            origin: '  Colombia  ',
        }

        expect(
            validateCompetitorForm(values, new Date('2026-09-13T00:00:00')),
        ).toEqual({})

        expect(toCompetitorRequest(values)).toEqual({
            name: 'Byte',
            nickname: 'ByteTheCamel',
            competitorType: 'CAMEL',
            dateOfBirth: '2016-05-20',
            approximateAge: null,
            weightKg: 400,
            heightCm: 220,
            origin: 'Colombia',
        })
    })

    it('maps approximate age without sending date of birth', () => {
        const values = setCompetitorAgeReferenceType(
            {
                ...createCompetitorFormValues(competitor),
                approximateAge: '21',
            },
            'approximateAge',
        )

        expect(toCompetitorRequest(values)).toEqual({
            name: 'Byte',
            nickname: 'ByteTheCamel',
            competitorType: 'CAMEL',
            dateOfBirth: null,
            approximateAge: 21,
            weightKg: 400,
            heightCm: 220,
            origin: 'Colombia',
        })
    })
})