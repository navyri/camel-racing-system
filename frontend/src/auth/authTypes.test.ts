import { describe, expect, it } from 'vitest'
import { getAppRoles, isAppRole } from './authTypes'

describe('auth role helpers', () => {
    it('identifies supported application roles', () => {
        expect(isAppRole('ADMIN')).toBe(true)
        expect(isAppRole('USER')).toBe(true)
        expect(isAppRole('MANAGER')).toBe(false)
    })

    it('filters realm roles to application roles', () => {
        expect(getAppRoles(['offline_access', 'ADMIN', 'uma_authorization', 'USER'])).toEqual([
            'ADMIN',
            'USER',
        ])
    })
})