import { describe, expect, it } from 'vitest'
import { getAppRoles, isAppRole } from './authTypes'

describe('auth role helpers', () => {
    it('identifies supported application roles', () => {
        expect(isAppRole('ADMINISTRATOR')).toBe(true)
        expect(isAppRole('RACE_ORGANIZER')).toBe(true)
        expect(isAppRole('VIEWER')).toBe(true)
        expect(isAppRole('UNSUPPORTED_ROLE')).toBe(false)
    })

    it('filters realm roles to application roles', () => {
        expect(
            getAppRoles([
                'offline_access',
                'ADMINISTRATOR',
                'uma_authorization',
                'RACE_ORGANIZER',
                'VIEWER',
            ]),
        ).toEqual(['ADMINISTRATOR', 'RACE_ORGANIZER', 'VIEWER'])
    })
})